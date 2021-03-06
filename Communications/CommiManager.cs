#region 版本说明

/*
 * 功能内容：   通讯参数,对TCP/UDP/SerialPort通讯的实现
 *
 * 作    者：   王荣策
 *
 * 审 查 者：   王荣策
 *
 * 日    期：   2010-05-29
 */

#endregion


using Granity.communications;
using System.Collections.Generic;
using System;
using System.Threading;
using System.Net.Sockets;
using Microsoft.ApplicationBlocks.ExceptionManagement;
using System.Collections.Specialized;
using System.Text;
using System.IO.Ports;
using System.Net;
using System.Diagnostics;
using System.IO;
using System.Net.NetworkInformation;


namespace Granity.communications 
{
	/// <summary>
	/// 通讯管理,提供通讯的统一接口,封装大容量通讯,支持多线程
	/// </summary>
	public class CommiManager
    {

        #region 内置类

        /// <summary>
        /// 内置通讯实例类,关联通讯实例和通讯参数及命令
        /// 通讯参数是标识,通讯实例可重用,命令可重新赋值使用
        /// </summary>
        private class CommiEntity
        {
            /// <summary>
            /// 通讯参数
            /// </summary>
            public CommiTarget target;
            /// <summary>
            /// 通讯ClientEntity实例(ClientEntity&lt;Socket|UDPClient|SerialPort>)
            /// </summary>
            public Object Entity;
            /// <summary>
            /// 通讯数据命令,需做多线程同步处理锁整个CommiEntity实例
            /// </summary>
            public List<CommandBase> CmdList = new List<CommandBase>();
            /// <summary>
            /// 缓冲接收数据,接收多帧时进行拼接
            /// </summary>
            public byte[] buffer = new byte[0];
            /// <summary>
            /// 当前是否在运行,read和write需要同步退出
            /// </summary>
            public bool running = false;
            /// <summary>
            /// 写数据时间，以双重验证running
            /// </summary>
            public DateTime dtwrite = DateTime.MinValue;
            /// <summary>
            /// 读数据时间，以双重验证running
            /// </summary>
            public DateTime dtread = DateTime.MinValue;
            /// <summary>
            /// 同步写数据使用,在需要读写同步处理时互相同步
            /// </summary>
            public ManualResetEvent writewh = new ManualResetEvent(false);
            /// <summary>
            /// 同步读数据使用,在需要读写同步处理时互相同步
            /// </summary>
            public ManualResetEvent readwh = new ManualResetEvent(false);
        }

        /// <summary>
        /// 通讯Client
        /// </summary>
        /// <typeparam name="Tsocket">Socket/UDPClient/SerialPort</typeparam>
        private class ClientEntity<Tclient> where Tclient : class
        {
            public Tclient client;
            public bool isWorking = false;
        }

        #endregion

        /// <summary>
        /// GB2312编码器
        /// </summary>
        private static Encoding encodGB2312 = Encoding.GetEncoding("GB2312");

        /// <summary>
		/// 通讯目标参数列表,添加项需要多线程同步处理
		/// </summary>
        private List<CommiEntity> entityList = new List<CommiEntity>();
        /// <summary>
        /// TCP通讯缓存,在通讯异常时可重复使用,空闲过多时可关闭删除释放缓存
        /// </summary>
        private List<ClientEntity<Socket>> clientTcptList = new List<ClientEntity<Socket>>();
        /// <summary>
        /// UDP通讯缓存,在通讯异常时可重复使用,空闲过多时可关闭删除释放缓存
        /// </summary>
        private List<ClientEntity<UdpClient>> clientUdpList = new List<ClientEntity<UdpClient>>();
        /// <summary>
        /// Ser串口通讯缓存,在通讯异常时可重复使用,空闲过多时可关闭删除释放缓存
        /// </summary>
        private List<ClientEntity<SerialPort>> clientSerList = new List<ClientEntity<SerialPort>>();

		/// <summary>
		/// 响应事件
		/// </summary>
		public event EventHandler<ResponseEventArgs> ResponseHandle;
        /// <summary>
        /// 通讯异常事件
        /// </summary>
        public event EventHandler<ErrorCommiEventArgs> ErrorCommiHandle;
        /// <summary>
        /// 通讯链路打开时异常事件
        /// </summary>
        public event EventHandler<ErrorCommiEventArgs> ErrorOpenHandle;
        /// <summary>
        /// 通讯发送数据时异常事件
        /// </summary>
        public event EventHandler<ErrorCommiEventArgs> ErrorWriteHandle;
        /// <summary>
        /// 通讯接收数据时异常事件
        /// </summary>
        public event EventHandler<ErrorCommiEventArgs> ErrorReadHandle;

        /// <summary>
        /// 实例构造函数
        /// </summary>
        public CommiManager()
        {

        }

        static CommiManager()
        {
            globalmgr = new CommiManager();
        }

        private static CommiManager globalmgr;
        
        /// <summary>
        /// 全局管理器
        /// </summary>
        public static CommiManager GlobalManager
        {
            get { return globalmgr; }
        }

        #region 发送指令数据

        /// <summary>
        /// 测试目标是否联通
        /// </summary>
        /// <param name="target">通讯目标</param>
        /// <returns>是否可连接通讯(或是否在线)</returns>
        public bool TestConnect(CommiTarget target)
        {
            if (null == target)
                return false;
            if (CommiType.SerialPort == target.ProtocolType && string.IsNullOrEmpty(target.PortName))
                return false;
            else if (CommiType.SerialPort != target.ProtocolType && null == target.SrvEndPoint)
                return false;
            string ipaddress = "";
            if (CommiType.SerialPort != target.ProtocolType)
                ipaddress = target.SrvEndPoint.Address.ToString();

            CommiEntity entity = null;
            CommiEntity[] entitys = this.entityList.ToArray();
            for (int i = 0; i < entitys.Length; i++)
            {
                CommiTarget p = entitys[i].target;
                if (p.ProtocolType != target.ProtocolType)
                    continue;
                if (CommiType.SerialPort != target.ProtocolType)
                {
                    if (target.SrvEndPoint.Port == p.SrvEndPoint.Port && ipaddress == p.SrvEndPoint.Address.ToString())
                        entity = entitys[i];
                }
                else if (target.PortName == p.PortName)
                    entity = entitys[i];
                if (null != entity)
                    break;
            }
            bool isconn = false;
            object objconn = null;
            if (null != entity)
                objconn = entity.Entity;
            if (CommiType.SerialPort == target.ProtocolType)
            {
                ClientEntity<SerialPort> objentity = objconn as ClientEntity<SerialPort>;
                SerialPort serial = null == objentity ? null : objentity.client;
                if (null == serial)
                {
                    serial = new SerialPort();
                    serial.PortName = target.PortName;
                    serial.BaudRate = target.BaudRate;
                    serial.DataBits = target.DataBits;
                    serial.Parity = target.Parity;
                    serial.StopBits = target.StopBits;
                }
                if (serial.IsOpen)
                    return true;
                try
                {
                    serial.Open();
                }
                catch { }
                isconn = serial.IsOpen;
                serial.Close();
                return isconn;
            }
            if (null == target.SrvEndPoint || null == target.SrvEndPoint.Address)
                return false;
            Ping ping = new Ping();
            PingReply reply = ping.Send(target.SrvEndPoint.Address);
            return IPStatus.Success == reply.Status;
        }
        /// <summary>
        /// 触发同步事件，运行一个或多个线程同步继续
        /// </summary>
        /// <param name="target">需要同步的通讯目标</param>
        public void SynchHandleSet(CommiTarget target)
        {
            if (null == target)
                return;
            CommiEntity entity = this.getEntity(target);
            if (null == entity)
                return;
            entity.writewh.Set();
            entity.readwh.Set();
        }
        /// <summary>
        /// 在目标位置是否已经有指令
        /// </summary>
        /// <param name="target">目标位置</param>
        /// <param name="cmd">通讯指令</param>
        /// <returns></returns>
        public bool ContainCommand(CommiTarget target, CommandBase cmd)
        {
            CommiEntity entity = this.getEntity(target);
            //指令加入通讯实例命令列表中
            return entity.CmdList.Contains(cmd);
        }

        /// <summary>
		/// 发送通讯命令,命令已经存在则重用不在加命令
		/// </summary>
		/// <param name="target">目标位置</param>
		/// <param name="cmd">通讯指令</param>
        public void SendCommand(CommiTarget target, CommandBase cmd)
        {
            this.SendCommand(target, cmd, false);
        }
        /// <summary>
		/// 发送通讯命令,命令已经存在则重用不在加命令
		/// </summary>
		/// <param name="target">目标位置</param>
		/// <param name="cmd">通讯指令</param>
        /// <param name="reset">是否时间重置</param>
        public void SendCommand(CommiTarget target, CommandBase cmd, bool reset)
        {
            if (null == target || null == cmd)
                return;
            CommiEntity entity = this.getEntity(target);
            //指令加入通讯实例命令列表中
            bool isexist = entity.CmdList.Contains(cmd);
            //if (!isexist && !string.IsNullOrEmpty(cmd.CmdId))
            //{
            //    CommandBase[] cmds = entity.CmdList.ToArray();
            //    for (int i = 0; i < cmds.Length; i++)
            //    {
            //        if (!cmd.Equals(cmds[i]) && cmd.CmdId != cmds[i].CmdId)
            //            continue;
            //        isexist = true;
            //        break;
            //    }
            //}
            //检查如果不存在于列表则加入列表中
            if (!isexist)
            {
                Monitor.Enter(entity.CmdList);
                entity.CmdList.Insert(0, cmd);
                Monitor.PulseAll(entity.CmdList);
                Monitor.Exit(entity.CmdList);
            }
            //通讯实例已运行则发送同步事件,否则启动
            bool isreading = entity.running;
            bool iswriting = entity.running;
            if (reset) cmd.ResetState();
            if (entity.running)
            {
                entity.readwh.Set();
                entity.writewh.Set();
                DateTime dt = DateTime.Now.AddMilliseconds(-500);
                if (entity.dtread > dt && entity.dtwrite > dt)
                    return;
                Thread.Sleep(50);
                if (entity.dtread > dt && entity.dtwrite > dt)
                    return;
                isreading = entity.dtread > dt;
                iswriting = entity.dtwrite > dt;
            }
            switch (entity.target.ProtocolType)
            {
                case CommiType.TCP:
                    if (null == entity.target.SrvEndPoint)
                        return;
                    entity.running = true;
                    if (!iswriting)
                        ThreadManager.QueueUserWorkItem(delegate(object obj) { this.writeTCP(obj as CommiEntity); }, entity);
                    if (!isreading)
                        ThreadManager.QueueUserWorkItem(delegate(object obj) { this.readTCP(obj as CommiEntity); }, entity);
                    break;
                //UPD通讯接收数据在通讯bind本地地址时开始接收
                case CommiType.UDP:
                    if (null == entity.target.SrvEndPoint)
                        return;
                    entity.running = true;
                    this.openUDP(entity);
                    if (!iswriting)
                        ThreadManager.QueueUserWorkItem(delegate(object obj) { this.writeUDP(obj as CommiEntity); }, entity);
                    if (!isreading)
                        ThreadManager.QueueUserWorkItem(delegate(object obj) { this.readUDP(obj as CommiEntity); }, entity);
                    break;
                //串口数据在SerialPort触发接收事件时读取的
                case CommiType.SerialPort:
                    if (string.IsNullOrEmpty(entity.target.PortName))
                        return;
                    entity.running = true;
                    if (!isreading)
                        ThreadManager.QueueUserWorkItem(delegate(object obj) { this.readSer(obj as CommiEntity); }, entity);
                    if (!iswriting)
                        ThreadManager.QueueUserWorkItem(delegate(object obj) { this.writeSer(obj as CommiEntity); }, entity);
                    break;
            }
        }

		/// <summary>
		/// 发送通讯命令
		/// </summary>
		/// <param name="target">通讯的目标位置</param>
		/// <param name="cmd">通讯命令</param>
        public void SendCommand(CommiTarget target, string cmd)
        {
            if (string.IsNullOrEmpty(cmd))
                return;
            CommandBase cmdctrl = new CommandBase();
            cmdctrl.setCommand(cmd);
            SendCommand(target, cmdctrl);
        }

        /// <summary>
        /// 发送通讯命令
        /// </summary>
        /// <param name="target">通讯的目标位置</param>
        /// <param name="cmd">通讯命令</param>
        /// <param name="isHEX">是否16进制格式字符串</param>
        public void SendCommand(CommiTarget target, string cmd, bool isHEX)
        {
            if (string.IsNullOrEmpty(cmd))
                return;
            CommandBase cmdctrl = new CommandBase();
            cmdctrl.setCommand(cmd, isHEX);
            SendCommand(target, cmdctrl);
        }
        
        /// <summary>
		/// 发送通讯指令
		/// </summary>
		/// <param name="target">通讯目标位置</param>
		/// <param name="cmd">通讯指令字节</param>
        public void SendCommand(CommiTarget target, byte[] cmd)
        {
            if (null == target || null == cmd || cmd.Length < 1)
                return;
            CommandBase cmdctrl = new CommandBase();
            cmdctrl.setCommand(cmd);
            SendCommand(target, cmdctrl);
        }

        /// <summary>
        /// 移除目标地址通讯的指定指令
        /// </summary>
        /// <param name="target">通讯的目标位置</param>
        /// <param name="cmd">要移除的指令</param>
        public void RemoveCommand(CommiTarget target, CommandBase cmd)
        {
            if (null == target || null == cmd)
                return;
            CommiEntity entity = this.getEntity(target);
            if (entity.CmdList.Contains(cmd))
            {
                Monitor.Enter(entity.CmdList);
                entity.CmdList.Remove(cmd);
                Monitor.PulseAll(entity.CmdList);
                Monitor.Exit(entity.CmdList);
            }
            if (entity.CmdList.Count < 1)
            {
                entity.running = false;
                entity.writewh.Set();
                entity.readwh.Set();
                if (CommiType.SerialPort == target.ProtocolType)
                    this.closeSer(entity);
                else if (CommiType.TCP == target.ProtocolType)
                    this.closeTCP(entity);
                else
                    this.closeUDP(entity);
            }
        }

        /// <summary>
        /// 移除目标地址通讯的所有指令
        /// </summary>
        /// <param name="target">通讯的目标位置</param>
        public void RemoveCommand(CommiTarget target)
        {
            if (null == target)
                return;
            CommiEntity entity = this.getEntity(target);
            entity.running = false;
            entity.writewh.Set();
            entity.readwh.Set();
            Monitor.Enter(entity.CmdList);
            entity.CmdList.Clear();
            Monitor.PulseAll(entity.CmdList);
            Monitor.Exit(entity.CmdList);
            if (CommiType.SerialPort == target.ProtocolType)
                this.closeSer(entity);
            else if (CommiType.TCP == target.ProtocolType)
                this.closeTCP(entity);
            else
            {
                this.closeUDP(entity);
                //更换UDP通讯实例,临时测试使用
                ClientEntity<UdpClient>[] entitys = this.clientUdpList.ToArray();
                for (int i = 0; i < entitys.Length; i++)
                {
                    if (null == entitys[i] || null == entitys[i].client || entitys[i].isWorking)
                        continue;
                    entitys[i].isWorking = true;
                    UdpClient t = entitys[i].client;
                    IPEndPoint localEP = new IPEndPoint(IPAddress.Any, 0);
                    UdpClient c = new UdpClient(localEP);
                    c.EnableBroadcast = true;
                    entitys[i].client = c;
                    if (null != t)
                        t.Close();
                }
            }
        }

        /// <summary>
        /// 清空放弃当前指令的执行
        /// </summary>
        public void ClearCommand()
        {
            Monitor.Enter(this.entityList);
            CommiEntity[] entities = this.entityList.ToArray();
            this.entityList.Clear();
            Monitor.PulseAll(this.entityList);
            Monitor.Exit(this.entityList);

            Monitor.Enter(this.argsChannel);
            argsChannel.Clear();
            Monitor.PulseAll(this.argsChannel);
            Monitor.Exit(this.argsChannel);
            Monitor.Enter(this.argsHandle);
            argsHandle.Clear();
            Monitor.PulseAll(this.argsHandle);
            Monitor.Exit(this.argsHandle);
            Monitor.Enter(this.argsHdl);
            argsHdl.Clear();
            Monitor.PulseAll(this.argsHdl);
            Monitor.Exit(this.argsHdl);
            this.dtRunChannel = DateTime.MinValue;
            this.dtRunHandle = DateTime.MinValue;
            this.dtRunHdl = DateTime.MinValue;

            for (int i = 0; i < entities.Length; i++)
            {
                Monitor.Enter(entities[i].CmdList);
                entities[i].CmdList.Clear();
                Monitor.PulseAll(entities[i].CmdList);
                Monitor.Exit(entities[i].CmdList);
                entities[i].running = false;
                entities[i].writewh.Set();
                entities[i].readwh.Set();
                CommiTarget target = entities[i].target;
                if (CommiType.SerialPort == target.ProtocolType)
                    this.closeSer(entities[i]);
                else if (CommiType.TCP == target.ProtocolType)
                    this.closeTCP(entities[i]);
                else
                    this.closeUDP(entities[i]);
            }
        }

        /// <summary>
        /// 关闭重置通讯状态,需要在清空命令和关闭线程后执行
        /// </summary>
        public void ResetClient()
        {
            this.ClearCommand();
            Monitor.Enter(this.clientTcptList);
            ClientEntity<Socket>[] clienttcps = this.clientTcptList.ToArray();
            this.clientTcptList.Clear();
            Monitor.PulseAll(this.clientTcptList);
            Monitor.Exit(this.clientTcptList);
            for (int i = 0; i < clienttcps.Length; i++)
            {
                Socket skt = clienttcps[i].client;
                clienttcps[i].client = null;
                clienttcps[i].isWorking = false;
                if (null != skt) skt.Close();
            }

            Monitor.Enter(this.clientUdpList);
            ClientEntity<UdpClient>[] clientudps = this.clientUdpList.ToArray();
            this.clientUdpList.Clear();
            Monitor.PulseAll(this.clientUdpList);
            Monitor.Exit(this.clientUdpList);
            for (int i = 0; i < clientudps.Length; i++)
            {
                clientudps[i].client.Close();
                clientudps[i].isWorking = false;
            }

            Monitor.Enter(this.clientSerList);
            ClientEntity<SerialPort>[] clientsers = this.clientSerList.ToArray();
            this.clientSerList.Clear();
            Monitor.PulseAll(this.clientSerList);
            Monitor.Exit(this.clientSerList);
            for (int i = 0; i < clientsers.Length; i++)
            {
                clientsers[i].client.Close();
                clientsers[i].isWorking = false;
            }
        }
        /// <summary>
        /// 清空接收响应的缓存,以及时清除有错误的缓存
        /// </summary>
        /// <param name="target">通讯目标</param>
        public void ClearBuffer(CommiTarget target)
        {
            CommiEntity entity = this.getEntity(target);
            if (null == entity) return;
            entity.readwh.Set();
            entity.readwh.WaitOne(100, false);
            Monitor.Enter(entity);
            entity.buffer = new byte[0];
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
        }
        #endregion

        #region 获取空闲实例和获取空闲通讯Socket

        /// <summary>
        /// 从缓存中找到通讯实例(包含一个TCP/UDP/SerialPort和指令列表及状态信息)
        /// 如果没有则创建一个新的实例并加入缓存中
        /// </summary>
        /// <param name="target">终端目标</param>
        private CommiEntity getEntity(CommiTarget target)
        {
            if (null == target)
                return null;

            CommiEntity[] entitys = this.entityList.ToArray();

            //如果是TCP/UDP通讯获取IP地址
            string ipaddress = "";
            if (CommiType.SerialPort != target.ProtocolType)
                ipaddress = target.SrvEndPoint.Address.ToString();
            //重用现有的通讯实例
            CommiEntity entity = null;
            for (int i = 0; i < entitys.Length; i++)
            {
                CommiTarget p = entitys[i].target;
                if (p.ProtocolType != target.ProtocolType)
                    continue;
                if (CommiType.SerialPort != target.ProtocolType)
                {
                    if (target.SrvEndPoint.Port == p.SrvEndPoint.Port && ipaddress == p.SrvEndPoint.Address.ToString())
                        entity = entitys[i];
                }
                else if (target.PortName == p.PortName)
                    entity = entitys[i];
                if (null != entity)
                    break;
            }
            //创建新的通讯实例
            if (null == entity)
            {
                entity = new CommiEntity();
                entity.target = target.Clone();
                Monitor.Enter(this.entityList);
                this.entityList.Add(entity);
                Monitor.PulseAll(this.entityList);
                Monitor.Exit(this.entityList);
            }
            if (null != target.Ptl)
                entity.target.setProtocol(target.Ptl);
            return entity;
        }

        /// <summary>
        /// 从缓存中找到空闲的嵌套字(UDP使用同一个来通讯)
        /// </summary>
        /// <typeparam name="T">Socket/UDPClient/SerialPort</typeparam>
        /// <param name="list">缓存列表</param>
        /// <returns>返回可用的Client,没有空闲的就创建新的</returns>
        private ClientEntity<T> getClient<T>(List<ClientEntity<T>> list) where T:class
        {
            if (null == list)
                return null;
            ClientEntity<T>[] clients = list.ToArray();

            for (int i = 0; i < clients.Length; i++)
            {
                if (clients[i].isWorking)
                    continue;
                clients[i].isWorking = true;
                return clients[i];
            }
            //没有则创建新的
            ClientEntity<T> entity = new ClientEntity<T>();
            if (list is List<ClientEntity<Socket>>)
            {
                Socket st = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
                st.NoDelay = true;
                entity.client = st as T;
            }
            else if (list is List<ClientEntity<UdpClient>>)
            {
                IPEndPoint localEP = new IPEndPoint(IPAddress.Any, 0);
                UdpClient c = new UdpClient(localEP);
                c.EnableBroadcast = true;
                uint IOC_IN = 0x80000000;
                uint IOC_VENDOR = 0x18000000;
                uint SIO_UDP_CONNRESET = IOC_IN | IOC_VENDOR | 12;
                c.Client.IOControl((int)SIO_UDP_CONNRESET, new byte[] { Convert.ToByte(false) }, null);
                entity.client = c as T;
            }
            else if (list is List<ClientEntity<SerialPort>>)
            {
                SerialPort s = new SerialPort();
                entity.client = s as T;
            }
            else
                return null;
            entity.isWorking = true;
            Monitor.Enter(list);
            list.Add(entity);
            Monitor.PulseAll(list);
            Monitor.Exit(list);
            return entity;
        }

        #endregion

        #region 异步写入指令数据通讯

        /// <summary>
        /// 打开通讯,失败时置目标通讯为空闲
        /// </summary>
        /// <param name="entity">目标通讯实例</param>
        /// <returns>是否打开连接</returns>
        private bool openTCP(CommiEntity entity)
        {
            Monitor.Enter(entity);
            ClientEntity<Socket> clientEntity = entity.Entity as ClientEntity<Socket>;
            //创建Socket并打开连接
            if (null == clientEntity)
                entity.Entity = clientEntity = this.getClient(this.clientTcptList);
            if (clientEntity.client.Connected)
            {
                Monitor.PulseAll(entity);
                Monitor.Exit(entity);
                return true;
            }
            Socket skt = clientEntity.client;
            //多线程使用通讯的同步
            bool connected = false;
            try
            {
                if (!skt.Connected)
                    skt.Connect(entity.target.SrvEndPoint);
                connected = true;
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("断开套接字连接"))
                {
                    Socket st = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
                    st.NoDelay = true;
                    clientEntity.client = st;
                }
            }
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
            return connected;
        }

        /// <summary>
        /// 打开通讯,失败时置目标通讯为空闲
        /// </summary>
        /// <param name="entity">目标通讯实例</param>
        /// <returns>是否打开连接</returns>
        private bool openSer(CommiEntity entity)
        {
            Monitor.Enter(entity);
            ClientEntity<SerialPort> clientEntity = entity.Entity as ClientEntity<SerialPort>;
            if (null == clientEntity)
                entity.Entity = clientEntity = this.getClient(this.clientSerList);
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
            SerialPort client = clientEntity.client;
            if (client.IsOpen)
                return true;
            //多线程使用通讯的同步
            bool isopen = true;
            Monitor.Enter(entity);
            if (!client.IsOpen)
            {
                client.PortName = entity.target.PortName;
                client.BaudRate = entity.target.BaudRate;
                client.DataBits = entity.target.DataBits;
                client.Parity = entity.target.Parity;
                client.StopBits = entity.target.StopBits;
                try { client.Open(); }
                catch
                {
                    isopen = false;
                }
            }
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
            return isopen;
        }

        /// <summary>
        /// 打开通讯,失败时置目标通讯为空闲
        /// </summary>
        /// <param name="entity">目标通讯实例</param>
        /// <returns>是否打开连接</returns>
        private bool openUDP(CommiEntity entity)
        {
            ClientEntity<UdpClient> clientEntity = entity.Entity as ClientEntity<UdpClient>;
            if (null == clientEntity)
                entity.Entity = clientEntity = this.getClient(this.clientUdpList);
            return true;
        }

        /// <summary>
        /// 关闭通讯并置目标通讯为空闲,异常时处理同步线程
        /// </summary>
        /// <param name="entity">目标通讯实例</param>
        private void closeTCP(CommiEntity entity)
        {
            Monitor.Enter(entity);
            ClientEntity<Socket> client = entity.Entity as ClientEntity<Socket>;
            entity.Entity = null;
            entity.buffer = new byte[0];
            Socket skt = null;
            if (null != client)
            {
                skt = client.client;
                client.client = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
                client.isWorking = false;
            }
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
            if (null != skt)
                skt.Close();
        }
        /// <summary>
        /// 关闭通讯并置目标通讯为空闲,异常时处理同步线程
        /// </summary>
        /// <param name="entity">目标通讯实例</param>
        /// <param name="reopen">是否重新打开</param>
        private void closeTCP(CommiEntity entity, bool reopen)
        {
            Monitor.Enter(entity);
            ClientEntity<Socket> client = entity.Entity as ClientEntity<Socket>;
            if (reopen)
            {
                try
                {
                    Socket sk = client.client;
                    int a = sk.Available;
                    if (!sk.Connected)
                        sk.Connect(entity.target.SrvEndPoint);
                    a = sk.Available;
                    Monitor.PulseAll(entity);
                    Monitor.Exit(entity);
                    return;
                }
                catch { }
            }
            entity.Entity = null;
            entity.buffer = new byte[0];
            Socket skt = null;
            if (null != client)
            {
                skt = client.client;
                client.client = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
                client.isWorking = false;
            }
            if (reopen)
            {
                entity.Entity = client = this.getClient<Socket>(this.clientTcptList);
                Socket sk = client.client;
                try
                {
                    if (!sk.Connected)
                        sk.Connect(entity.target.SrvEndPoint);
                }
                catch { }
            }
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
            if (null != skt)
                skt.Close();
        }

        /// <summary>
        /// 关闭通讯并置目标通讯为空闲,异常时处理同步线程
        /// </summary>
        /// <param name="entity">目标通讯实例</param>
        private void closeSer(CommiEntity entity)
        {
            Monitor.Enter(entity);
            ClientEntity<SerialPort> client = entity.Entity as ClientEntity<SerialPort>;
            entity.Entity = null;
            entity.buffer = new byte[0];
            if (null != client && null != client.client)
            {
                client.client.Close();
                client.isWorking = false;
            }
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
        }
        /// <summary>
        /// 关闭通讯,UDP通讯不需要关闭只置目标通讯为空闲,异常时处理同步线程
        /// </summary>
        /// <param name="entity"></param>
        private void closeUDP(CommiEntity entity)
        {
            Monitor.Enter(entity);
            ClientEntity<UdpClient> client = entity.Entity as ClientEntity<UdpClient>;
            entity.Entity = null;
            entity.buffer = new byte[0];
            if (null != client)
                client.isWorking = false;
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
        }

        /// <summary>
        /// 关闭Socket以重用
        /// </summary>
        /// <param name="client"></param>
        private void closeTCPSocket(ClientEntity<Socket> client)
        {
            if (null == client)
                return;
            if (null == client.client)
                client.client = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
            if (client.client.Connected)
                try
                {
                    client.client.Shutdown(SocketShutdown.Both);
                    client.client.Disconnect(true);
                }
                catch
                {
                    client.client.Close();
                    client.client = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
                }
            client.isWorking = false;
        }

        
        /// <summary>
        /// 检查指令中是否有指定状态的指令
        /// </summary>
        /// <param name="cmds">指令数组</param>
        /// <param name="state">指令状态</param>
        /// <returns>是否包含指定指令的状态</returns>
        private bool containState(CommandBase[] cmds, CmdState state)
        {
            foreach (CommandBase cmd in cmds)
            {
                if (null == cmd) continue;
                CmdState st = cmd.CheckState();
                if (state == st)
                    return true;
            }
            return false;
        }

        /// <summary>
        /// 检查指令中是否有指定状态的指令,只对指令数组中键值相同的指令做对比
        /// </summary>
        /// <param name="cmds">指令数组</param>
        /// <param name="ptl">协议</param>
        /// <param name="data">包含指令键值的字节指令数据</param>
        /// <param name="state">指令状态</param>
        /// <returns>是否包含指定指令的状态</returns>
        private bool containState(CommandBase[] cmds, Protocol ptl, byte[] data, CmdState state)
        {
            if (null == ptl || ptl.KeyLength < 1 || null == data || data.Length < 1 || data.Length < ptl.KeyLength)
                return this.containState(cmds, state);
            int start = ptl.KeyIndexStart < 0 ? ptl.FrameHeader.Length : ptl.KeyIndexStart;
            int lenmin = start + ptl.KeyLength;
            if (data.Length < lenmin)
                return this.containState(cmds, state);

            //检查状态和键值是否相同
            int len = ptl.KeyLength;
            byte[] address = new byte[len];
            byte[] addrcmd = new byte[len];
            Array.Copy(data, start, address, 0, len);
            foreach (CommandBase cmd in cmds)
            {
                if (null == cmd || state != cmd.CheckState())
                    continue;
                //检查指令
                byte[] datacmd = null;
                try { datacmd = cmd.getCommand(); }
                catch (Exception ex)
                {
                    ExceptionManager.Publish(ex);
                    continue;
                }
                if (null == datacmd || datacmd.Length < 1 || datacmd.Length < lenmin)
                    continue;
                //检查指令是否相同
                Array.Copy(datacmd, start, addrcmd, 0, len);
                bool iscontinue = true;
                for (int i = 0; i < len; i++)
                {
                    if (address[i] == addrcmd[i])
                        continue;
                    iscontinue = false;
                    break;
                }
                if (!iscontinue)
                    return true;
            }
            return false;
        }

        /// <summary>
        /// 异步写入TCP通讯数据,通过对当前状态writing的判断确保一个线程在写入指令数据
        /// </summary>
        /// <param name="entity">目标通讯实例</param>
        private void writeTCP(CommiEntity entity)
        {
            if (null == entity)
                return;
            entity.dtwrite = DateTime.Now;
            //监听发送命令,至到命令执行结束<正常结束或超限结束>
            CommiTarget commips = entity.target;
            CommandBase[] cmds = new CommandBase[0];
            while (true)
            {
                cmds = entity.CmdList.ToArray();
                if (cmds.Length < 1 || !entity.running)
                    break;
                entity.dtwrite = DateTime.Now;
                bool isconn = this.openTCP(entity);
                ClientEntity<Socket> clientEntity = entity.Entity as ClientEntity<Socket>;
                Socket client = null != clientEntity ? clientEntity.client : null;
                DateTime dtNext = DateTime.Now.AddSeconds(50);
                DateTime dtNow = DateTime.Now;
                for (int i = 0; i < cmds.Length; i++)
                {
                    CommandBase cmd = cmds[i];
                    if (null == cmd) continue;
                    CmdState state = cmd.CheckState();
                    if (isconn && CmdState.TimeFailLimit == state && FailAftPro.Reconn == cmd.FailProAf)
                    {
                        this.closeTCP(entity);
                        isconn = false;
                    }
                    if (CmdState.TimeFailLimit == state || CmdState.Completed == state)
                    {
                        ResponseEventArgs arg = new ResponseEventArgs(client, commips, cmds, new byte[0], cmd, CmdState.Completed == state);
                        this.raiseResponse(entity, arg);
                        continue;
                    }
                    if (!isconn) continue;
                    //下次检查时间点(超时检查点/重发检查点)
                    if (cmd.TimeOut > TimeSpan.Zero)
                    {
                        DateTime dtr = cmd.SendDatetime.Add(cmd.TimeOut);
                        if (CmdState.Request == state || CmdState.ReqTimeout == state)
                            dtr = dtNow.Add(cmd.TimeOut);
                        if (dtr > dtNow && dtr < dtNext && cmd.SendDatetime >= cmd.ResponseDatetime)
                            dtNext = dtr;
                    }
                    if (cmd.TimeSendInv > TimeSpan.Zero)
                    {
                        DateTime dts = cmd.SendDatetime.Add(cmd.TimeSendInv);
                        if (CmdState.Request == state || CmdState.ReqTimeout == state)
                            dts = dtNow.Add(cmd.TimeSendInv);
                        if (dts < dtNow)
                            dts = dts.Add(cmd.TimeSendInv);
                        if (dts >= dtNow && dts < dtNext)
                            dtNext = dts;
                    }
                    if (CmdState.Request != state && CmdState.ReqTimeout != state)
                        continue;
                    //串行执行时，有已经发送需等待的指令则忽略执行，下个周期再执行
                    if (null != commips.Ptl && SequenceType.Serial == commips.Ptl.ExecuteSequence
                        && this.containState(cmds, CmdState.Response))
                    {
                        dtNext = DateTime.Now.AddMilliseconds(50);
                        break;
                    }
                    if (!entity.running) return;
                    //发送通讯指令,计算下次发送指令的时间
                    entity.dtwrite = DateTime.Now;
                    byte[] buffer = new byte[0];
                    try
                    {
                        buffer = cmd.getCommand();
                        client.Send(buffer);
                        Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 发送：" + CommandBase.Parse(buffer));
                        myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 发送：" + CommandBase.Parse(buffer));
                        if (cmd.CreateDatetime == cmd.SendDatetime)
                            cmd.FirstDatetime = DateTime.Now;
                    }
                    catch (Exception ex)
                    {
                        if (!entity.running) return;
                        //ExceptionManager.Publish(ex);
                        clientEntity = entity.Entity as ClientEntity<Socket>;
                        if (null != clientEntity && client == clientEntity.client)
                            this.closeTCP(entity, true);
                        isconn = false;
                        dtNext = DateTime.Now;
                        ErrorCommiEventArgs err = new ErrorCommiEventArgs(client, entity.target, cmd, ex);
                        this.raiseErrorWrite(err);
                        break;
                    }
                    cmd.SendDatetime = DateTime.Now;
                }//for (int i = 0; i < cmds.Length; i++)
                TimeSpan ts = dtNext - DateTime.Now;
                if (ts>TimeSpan.Zero)
                {
                    entity.writewh.Reset();
                    entity.writewh.WaitOne(ts, false);
                    Thread.Sleep(1);
                    if (!entity.running)
                        return;
                }
            }//while (true)
            entity.running = false;
            entity.readwh.Set();
            this.closeTCP(entity);
        }

        /// <summary>
        /// 异步写入UDP通讯数据
        /// </summary>
        /// <param name="entity">通讯目标实例</param>
        private void writeUDP(CommiEntity entity)
        {
            if (null == entity)
                return;
            IPEndPoint srv = entity.target.SrvEndPoint;
            entity.dtwrite = DateTime.Now;
            //监听发送命令,至到命令执行结束<正常结束或超限结束>
            //UDP通讯不需要打开和关闭
            CommiTarget target = entity.target;
            CommandBase[] cmds = new CommandBase[0];
            while (true)
            {
                cmds = entity.CmdList.ToArray();
                if (cmds.Length < 1 || !entity.running)
                    break;
                entity.dtwrite = DateTime.Now;
                this.openUDP(entity);
                ClientEntity<UdpClient> clientEntity = entity.Entity as ClientEntity<UdpClient>;
                UdpClient client = null != clientEntity ? clientEntity.client : null;
                DateTime dtNext = DateTime.Now.AddSeconds(50);
                DateTime dtNow = DateTime.Now;
                for (int i = 0; i < cmds.Length; i++)
                {
                    CommandBase cmd = cmds[i];
                    if (null == cmd) continue;
                    CmdState state = cmd.CheckState();
                    if (CmdState.TimeFailLimit == state || CmdState.Completed == state)
                    {
                        ResponseEventArgs arg = new ResponseEventArgs(client, target, cmds, new byte[0], cmd, CmdState.Completed == state);
                        this.raiseResponse(entity, arg);
                        continue;
                    }
                    //下次检查时间点(超时检查点/重发检查点)
                    if (cmd.TimeOut > TimeSpan.Zero)
                    {
                        DateTime dtr = cmd.SendDatetime.Add(cmd.TimeOut);
                        if (CmdState.Request == state || CmdState.ReqTimeout == state)
                            dtr = dtNow.Add(cmd.TimeOut);
                        if (dtr > dtNow && dtr < dtNext && cmd.SendDatetime >= cmd.ResponseDatetime)
                            dtNext = dtr;
                    }
                    if (cmd.TimeSendInv > TimeSpan.Zero)
                    {
                        DateTime dts = cmd.SendDatetime.Add(cmd.TimeSendInv);
                        if (CmdState.Request == state || CmdState.ReqTimeout == state)
                            dts = dtNow.Add(cmd.TimeSendInv);
                        if (dts < dtNow)
                            dts = dts.Add(cmd.TimeSendInv);
                        if (dts >= dtNow && dts < dtNext)
                            dtNext = dts;
                    }
                    if (CmdState.Request != state && CmdState.ReqTimeout != state)
                        continue;
                    //串行执行时，有已经发送需等待的指令则忽略执行，下个周期再执行
                    if (null != target.Ptl && SequenceType.Serial == target.Ptl.ExecuteSequence 
                        && this.containState(cmds, CmdState.Response))
                    {
                        dtNext = DateTime.Now.AddMilliseconds(50);
                        break;
                    }
                    DateTime dtn = dtNow.Add(cmd.TimeOut);
                    if (dtn > dtNow && dtn < dtNext)
                        dtNext = dtn.AddMilliseconds(1);
                    if (!entity.running) return;
                    //发送通讯指令,计算下次发送指令的时间
                    entity.dtwrite = DateTime.Now;
                    byte[] buffer = new byte[0];
                    try
                    {
                        buffer = cmd.getCommand();
                        client.Send(buffer, buffer.Length, srv);
                        Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 发送：" + CommandBase.Parse(buffer, true));
                        myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 发送：" + CommandBase.Parse(buffer, true));
                        if (cmd.CreateDatetime == cmd.SendDatetime)
                            cmd.FirstDatetime = DateTime.Now;
                    }
                    catch (Exception ex)
                    {
                        if (!entity.running) return;
                        ExceptionManager.Publish(ex);
                        clientEntity = entity.Entity as ClientEntity<UdpClient>;
                        if (null != clientEntity && client == clientEntity.client)
                            this.closeUDP(entity);
                        dtNext = DateTime.Now;
                        object ct = null;
                        if (null != clientEntity)
                            ct = clientEntity.client;
                        ErrorCommiEventArgs err = new ErrorCommiEventArgs(ct, entity.target, cmd, ex);
                        this.raiseErrorWrite(err);
                        break;
                    }
                    cmd.SendDatetime = DateTime.Now;
                }//for (int i = 0; i < cmds.Length; i++)
                TimeSpan ts = dtNext - DateTime.Now;
                if (ts > TimeSpan.Zero)
                {
                    entity.writewh.Reset();
                    entity.writewh.WaitOne(ts, false);
                    if (!entity.running)
                        return;
                }
            }//while (true)
            entity.running = false;
            entity.readwh.Set();
            this.closeUDP(entity);
        }

		/// <summary>
		/// 异步写入Serial通讯数据
		/// </summary>
		/// <param name="entity">通讯目标实例</param>
        private void writeSer(CommiEntity entity)
        {
            if (null == entity)
                return;
            entity.dtwrite = DateTime.Now;
            //监听发送命令,至到命令执行结束<正常结束或超限结束>
            CommiTarget target = entity.target;
            CommandBase[] cmds = new CommandBase[0];
            while (true)
            {
                cmds = entity.CmdList.ToArray();
                if (cmds.Length < 1 || !entity.running)
                    break;
                entity.dtwrite = DateTime.Now;
                bool isconn = true;
                SerialPort client = null;
                DateTime dtNext = DateTime.Now.AddSeconds(5);
                DateTime dtNow = DateTime.Now;
                for (int i = 0; i < cmds.Length; i++)
                {
                    CommandBase cmd = cmds[i];
                    if (null == cmd) continue;
                    CmdState state = cmd.CheckState();
                    if (isconn && CmdState.TimeFailLimit == state && FailAftPro.Reconn == cmd.FailProAf)
                    {
                        this.closeSer(entity);
                        isconn = false;
                    }
                    if (CmdState.TimeFailLimit == state || CmdState.Completed == state)
                    {
                        ResponseEventArgs arg = new ResponseEventArgs(client, target, cmds, new byte[0], cmd, CmdState.Completed == state);
                        this.raiseResponse(entity, arg);
                        continue;
                    }
                    if (!isconn) continue;
                    //下次检查时间点(超时检查点/重发检查点)
                    if (cmd.TimeOut > TimeSpan.Zero && cmd.TimeOut < TimeSpan.MaxValue)
                    {
                        DateTime dtr = cmd.SendDatetime.Add(cmd.TimeOut);
                        if (CmdState.Request == state || CmdState.ReqTimeout == state)
                            dtr = dtNow.Add(cmd.TimeOut);
                        if (dtr > dtNow && dtr < dtNext && cmd.SendDatetime >= cmd.ResponseDatetime)
                            dtNext = dtr;
                    }
                    if (cmd.TimeSendInv > TimeSpan.Zero && cmd.TimeSendInv < TimeSpan.MaxValue)
                    {
                        DateTime dts = cmd.SendDatetime.Add(cmd.TimeSendInv);
                        if (CmdState.Request == state || CmdState.ReqTimeout == state)
                            dts = dtNow.Add(cmd.TimeSendInv);
                        if (dts < dtNow)
                            dts = dts.Add(cmd.TimeSendInv);
                        if (dts >= dtNow && dts < dtNext)
                            dtNext = dts;
                    }
                    if (CmdState.Request != state && CmdState.ReqTimeout != state)
                        continue;
                    //串行执行时，有已经发送需等待的指令则忽略执行，下个周期再执行
                    if (this.containState(cmds, CmdState.Response))
                    {
                        dtNext = DateTime.Now.AddMilliseconds(50);
                        break;
                    }
                    if (!entity.running)
                    {
                        return;
                    }
                    //发送通讯指令,计算下次发送指令的时间
                    isconn = this.openSer(entity);
                    if (!isconn) continue;
                    ClientEntity<SerialPort> clientEntity = entity.Entity as ClientEntity<SerialPort>;
                    client = null != clientEntity ? clientEntity.client : null;
                    entity.dtwrite = DateTime.Now;
                    byte[] buffer = new byte[0];
                    try
                    {
                        buffer = cmd.getCommand();
                        client.Write(buffer, 0, buffer.Length);
                        if (cmd.CreateDatetime == cmd.SendDatetime)
                            cmd.FirstDatetime = DateTime.Now;
                        Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 发送：" + CommandBase.Parse(buffer, true));
                        myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 发送：" + CommandBase.Parse(buffer, true));
                    }
                    catch (Exception ex)
                    {
                        if (!entity.running)
                            return;
                        ExceptionManager.Publish(ex);
                        clientEntity = entity.Entity as ClientEntity<SerialPort>;
                        if (null != clientEntity && client == clientEntity.client)
                            this.closeSer(entity);
                        dtNext = DateTime.Now;
                        isconn = false;
                        ErrorCommiEventArgs err = new ErrorCommiEventArgs(client, entity.target, cmd, ex);
                        this.raiseErrorWrite(err);
                        break;
                    }
                    cmd.SendDatetime = DateTime.Now;
                }//for (int i = 0; i < cmds.Length; i++)
                TimeSpan ts = dtNext - DateTime.Now;
                if (ts > TimeSpan.Zero)
                {
                    entity.writewh.Reset();
                    entity.writewh.WaitOne(ts, false);
                    Thread.Sleep(1);
                    if (!entity.running)
                    {
                        return;
                    }
                }
            }//while (true)
            entity.running = false;
            entity.readwh.Set();
            this.closeSer(entity);
        }

        #endregion

        #region 监听读取数据

        #region 对字节的处理

        /// <summary>
        /// 获取帧包含标识字节的起点位置
        /// </summary>
        /// <param name="src">字节流</param>
        /// <param name="pos">检查起点位置</param>
        /// <param name="frame">帧字节,字节流分帧的字节分隔符</param>
        /// <returns>返回标识起点位置</returns>
        private int frameIndexOf(byte[] src, int pos, byte[] frame)
        {
            if (null == src || src.Length < 1 || null == frame || frame.Length < 1 || src.Length < frame.Length)
                return -1;
            if (pos < 0) pos = 0;
            byte b = frame[0];
            for (int i = pos, len = src.Length; i < len; i++)
            {
                if (b != src[i])
                    continue;
                bool isfind = true;
                for (int j = 1; j < frame.Length; j++)
                {
                    if (frame[j] == src[i + j])
                        continue;
                    isfind = false;
                    break;
                }
                if (isfind)
                    return i;
            }
            return -1;
        }
        /// <summary>
        /// 获取帧结束索引号,帧尾最后一位索引号
        /// </summary>
        /// <param name="src">字节流</param>
        /// <param name="posstart">检查帧时的起点</param>
        /// <param name="ptl">通讯协议</param>
        /// <returns>成功则返回所引号,不包含帧字节返回-1</returns>
        private int frameEndIndex(byte[] src, int pos, Protocol ptl)
        {
            if (null == ptl || null==ptl.FrameHeader || ptl.FrameHeader.Length<1 
                    || null == ptl.FrameFoot || ptl.FrameFoot.Length < 1 
                    || pos >= src.Length)
                return -1;
            if (pos < 0) pos = 0;
            //没有长度信息,仅以帧尾判定
            if (ptl.TotalBytes < 1 && (ptl.LenIndexStart < 0 || ptl.LenLength < 1))
            {
                pos = frameIndexOf(src, pos + 1, ptl.FrameFoot);
                if (pos < 0) return -1;
                return pos + ptl.FrameFoot.Length - 1;
            }
            //寻找帧头
            byte[] frame = ptl.FrameHeader;
            int index = frameIndexOf(src, pos, frame);
            //解析帧内数据长度
            if (index < 0)
                return -1;
            //固定长度时
            if (ptl.TotalBytes > 0)
            {
                if (index + ptl.TotalBytes > src.Length)
                    return -1;
                return index + ptl.TotalBytes - 1;
            }

            //解析帧内数据长度
            if (index + ptl.LenIndexStart + ptl.LenLength > src.Length)
                return -1;
            byte[] btlen = new byte[ptl.LenLength];
            Array.Copy(src, index + ptl.LenIndexStart, btlen, 0, btlen.Length);
            string strlen = "0";
            if (ptl.IsLenByte)
                strlen = CommandBase.Parse(btlen, true);
            else
                strlen = CommandBase.Parse(btlen, ptl.LenEncoding);
            if (ptl.IsLenChangeHL)
            {
                string str = "";
                if (0 == strlen.Length % 2)
                    strlen = "0" + strlen;
                for (int i = 0, len = strlen.Length; i < len; i = i + 2)
                    str = strlen.Substring(i, 2) + str;
                strlen = str;
            }
            int lendata = 0;
            try
            {
                if (ptl.IsLenHEX)
                    lendata = Convert.ToInt32(Convert.ToUInt32(strlen, 16));
                else
                    lendata = Convert.ToInt32(strlen);
            }
            catch (Exception ex)
            {
                pos = this.frameIndexOf(src, pos, ptl.FrameFoot);
                if (pos < 1) return -1;
                return pos + ptl.FrameFoot.Length - 1;
            }
            //跨过数据段,检查帧尾
            pos = index + ptl.LenIndexStart + ptl.LenLength + lendata * ptl.EncodingByte;
            frame = ptl.FrameFoot;
            byte ff = frame[0];
            for (int i = pos, len = src.Length; i < len; i++)
            {
                if (ff != src[i])
                    continue;
                bool isfind = true;
                for (int j = 1; j < frame.Length; j++)
                {
                    if (frame[j] == src[i + j])
                        continue;
                    isfind = false;
                    break;
                }
                if (isfind)
                    return i + ptl.FrameFoot.Length - 1;
            }
            return -1;
        }

        /// <summary>
        /// 一帧分多次接收数据时，连接完整帧加入目标字节数组列表中,不完整帧放入临时上下文字节数组
        /// </summary>
        /// <param name="buffer">读取当前缓存字节流</param>
        /// <param name="len">字节流数据长度</param>
        /// <param name="temp">临时字节数组，或上次接收的不完整字节数组，或承接下次字节流的字节数组</param>
        /// <param name="destlist">目标字节数组列表</param>
        /// <param name="tpl">协议定义</param>
        /// <returns>返回目标字节数组列表,如果参数没有定义列表则创建</returns>
        private IList<byte[]> joinToList(byte[] buffer, int len, ref byte[] temp, IList<byte[]> destlist, Protocol tpl)
        {
            if (null == buffer || buffer.Length < 1 || buffer.Length < len)
                return destlist;
            if (null != tpl && null != tpl.MergeListHandle)
                return tpl.MergeListHandle(buffer, len, ref temp, destlist);
            buffer = buffer.Clone() as byte[];
            byte[] b = new byte[0];
            if (null == tpl || null == tpl.FrameFoot || tpl.FrameFoot.Length < 1)
            {
                if (temp.Length < 1 && buffer.Length == len)
                {
                    destlist.Add(buffer);
                    return destlist;
                }
                if (temp.Length < 1)
                    b = new byte[len];
                else
                {
                    b = temp;
                    temp = new byte[0];
                    Array.Resize<byte>(ref b, temp.Length + len);
                }
                Array.Copy(buffer, 0, b, temp.Length, temp.Length + len);
                destlist.Add(b);
                return destlist;
            }
            Array.Resize<byte>(ref temp, temp.Length + len);
            Array.Copy(buffer, 0, temp, temp.Length - len, len);
            int index = 0;
            while (index > -1)
            {
                index = this.frameIndexOf(temp, index, tpl.FrameHeader);
                if (index < 0)
                {
                    temp = new byte[0];
                    break;
                }
                int pos = this.frameEndIndex(temp, index, tpl);
                if (pos < 1)
                {
                    if (index == 0) break;
                    b = new byte[temp.Length - index];
                    Array.Copy(temp, index, b, 0, b.Length);
                    temp = b;
                    index = -1;
                    break;
                }
                try
                {
                    b = new byte[pos - index + 1];
                    Array.Copy(temp, index, b, 0, b.Length);
                    destlist.Add(b);
                }
                catch { }
                index = pos + 1;
            }
            return destlist;
        }

        #endregion
        
        /// <summary>
        /// 使用TCP通讯监听读取数据,读取数据会触发响应事件
        /// </summary>
        /// <param name="entity">通讯参数实例</param>
        private void readTCP(CommiEntity entity)
        {
            if (null == entity)
                return;
            entity.dtread = DateTime.Now;
            //接收读取数据,没有指令时结束监听
            CommiTarget target = entity.target;
            List<byte[]> list = new List<byte[]>();
            byte[] buffer = new byte[0];
            Monitor.Enter(entity);
            entity.buffer = new byte[0];
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
            while (true)
            {
                if (entity.CmdList.Count < 1 || !entity.running)
                    break;
                entity.dtread = DateTime.Now;
                if (!this.openTCP(entity))
                {
                    entity.readwh.Reset();
                    entity.readwh.WaitOne(10000, false);
                    Thread.Sleep(1);
                    if (!entity.running)
                        return;
                    entity.dtread = DateTime.Now;
                    continue;
                }
                ClientEntity<Socket> clientEntity = entity.Entity as ClientEntity<Socket>;
                Socket client = clientEntity.client;
                int available = 0;
                for (int i = 0; i < 200 && available < 1; i++)
                {
                    entity.readwh.Reset();
                    entity.readwh.WaitOne(10, false);
                    Thread.Sleep(1);
                    if (!entity.running) return;
                    entity.dtread = DateTime.Now;
                    try
                    {
                        available = client.Connected ? client.Available : 0;
                        if (!client.Connected) break;
                    }
                    catch { available = 0; break; }
                }
                if (available < 1) continue;
                if (buffer.Length < client.ReceiveBufferSize)
                    buffer = new byte[client.ReceiveBufferSize];
                if (!entity.running) return;
                //读取数据,支持一帧分多次发送
                while (available > 0)
                {
                    entity.dtread = DateTime.Now;
                    try
                    {
                        int len = client.Receive(buffer);
                        string msgrp = encodGB2312.GetString(buffer, 0, len);
                        Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 接收：" + msgrp);
                        myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 接收：" + msgrp);
                        Monitor.Enter(entity);
                        try
                        {
                            this.joinToList(buffer, len, ref entity.buffer, list, target.Ptl);
                        }
                        catch (Exception ex) { ExceptionManager.Publish(ex); }
                        Monitor.PulseAll(entity);
                        Monitor.Exit(entity);
                        try { available = client.Available; }
                        catch { available = 0; }
                    }
                    catch (Exception ex)
                    {
                        if (!entity.running) return;
                        //ExceptionManager.Publish(ex);
                        clientEntity = entity.Entity as ClientEntity<Socket>;
                        if (null != clientEntity && client == clientEntity.client)
                            this.closeTCP(entity, true);
                        ErrorCommiEventArgs err = new ErrorCommiEventArgs(client, entity.target, null, ex);
                        this.raiseErrorRead(err);
                        break;
                    }
                    byte[][] responses = list.ToArray();
                    foreach (byte[] response in responses)
                    {
                        //触发响应事件
                        ResponseEventArgs arg = new ResponseEventArgs(client, target, entity.CmdList.ToArray(), response);
                        this.raiseResponse(entity, arg);
                    }
                    list.Clear();
                }//while (available > 0)
            }//where(true)
            entity.running = false;
            entity.writewh.Set();
            this.closeTCP(entity);
        }

		/// <summary>
		/// 使用UDP通讯监听读取数据,读取数据会触发响应事件
		/// </summary>
		/// <param name="entity">通讯参数实例</param>
        private void readUDP(CommiEntity entity)
        {
            if (null == entity)
                return;
            entity.dtread = DateTime.Now;
            CommiTarget target = entity.target;
            //接收读取数据,没有指令时结束监听
            IPAddress ip = IPAddress.Parse(target.SrvEndPoint.Address.ToString());
            List<byte[]> list = new List<byte[]>();
            byte[] buffer = new byte[0];
            Monitor.Enter(entity);
            entity.buffer = new byte[0];
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
            while (true)
            {
                if (entity.CmdList.Count < 1 || !entity.running)
                    break;
                entity.dtread = DateTime.Now;
                this.openUDP(entity);
                ClientEntity<UdpClient> entityclient = entity.Entity as ClientEntity<UdpClient>;
                UdpClient client = null == entityclient ? null : entityclient.client;
                if (null == client)
                {
                    entity.readwh.WaitOne(20);
                    Thread.Sleep(1);
                    continue;
                }
                int available = 0;
                for (int i = 0; i < 200 && available < 1; i++)
                {
                    try
                    {
                        if (!client.Client.Poll(5, SelectMode.SelectRead))
                            continue;
                    }
                    catch { break; }
                    try { available = client.Available; }
                    catch { continue; }
                }
                if (available < 1) continue;
                if (!entity.running) return;
                //读取数据,支持一帧分多次发送
                while (available > 0)
                {
                    entity.dtread = DateTime.Now;
                    try
                    {
                        //读取数据
                        IPEndPoint srvEndPoint = new IPEndPoint(ip, target.SrvEndPoint.Port);
                        buffer = client.Receive(ref srvEndPoint);
                        Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 接收：" + CommandBase.Parse(buffer, true));
                        myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 接收：" + CommandBase.Parse(buffer, true));
                        Monitor.Enter(entity);
                        try
                        {
                            this.joinToList(buffer, buffer.Length, ref entity.buffer, list, target.Ptl);
                        }
                        catch (Exception ex) { ExceptionManager.Publish(ex); }
                        Monitor.PulseAll(entity);
                        Monitor.Exit(entity);
                        available = client.Available;
                    }
                    catch (Exception ex)
                    {
                        if (!entity.running) return;
                        ExceptionManager.Publish(ex);
                        this.closeUDP(entity);
                        if (!entity.running) return;
                        ErrorCommiEventArgs err = new ErrorCommiEventArgs(client, entity.target, null, ex);
                        this.raiseErrorRead(err);
                        break;
                    }
                    byte[][] responses = list.ToArray();
                    foreach (byte[] response in responses)
                    {
                        //触发响应事件
                        ResponseEventArgs arg = new ResponseEventArgs(client, target, entity.CmdList.ToArray(), response);
                        this.raiseResponse(entity, arg);
                    }
                    list.Clear();
                }
            }//where(true)
            entity.running = false;
            entity.writewh.Set();
            this.closeUDP(entity);
        }

        /// <summary>
        /// 使用TCP通讯监听读取数据,读取数据会触发响应事件
        /// </summary>
        /// <param name="entity">通讯参数实例</param>
        private void readSer(CommiEntity entity)
        {
            if (null == entity)
                return;
            entity.dtread = DateTime.Now;
            //接收读取数据,没有指令时结束监听
            CommiTarget target = entity.target;
            List<byte[]> list = new List<byte[]>();
            byte[] buffer = new byte[1024];
            Monitor.Enter(entity);
            entity.buffer = new byte[0];
            Monitor.PulseAll(entity);
            Monitor.Exit(entity);
            while (true)
            {
                entity.readwh.Reset();
                entity.readwh.WaitOne(10, false);
                Thread.Sleep(1);
                if (entity.CmdList.Count < 1 || !entity.running)
                    break;
                entity.dtread = DateTime.Now;
                if (!this.openSer(entity))
                {
                    entity.readwh.Reset();
                    entity.readwh.WaitOne(10000, false);
                    Thread.Sleep(1);
                    if (!entity.running)    return;
                    if (entity.CmdList.Count < 1)
                        break;
                    continue;
                }
                if (!entity.running) return;
                ClientEntity<SerialPort> clientEntity = entity.Entity as ClientEntity<SerialPort>;
                SerialPort client = clientEntity.client;
                //检查无数据则等待
                int bytesread = 0;
                for (int i = 0; i < 200 && bytesread < 1; i++)
                {
                    entity.readwh.Reset();
                    entity.readwh.WaitOne(10, false);
                    Thread.Sleep(1);
                    if (!entity.running) return;
                    if (!client.IsOpen)
                        break;
                    entity.dtread = DateTime.Now;
                    try { bytesread = client.BytesToRead; }
                    catch { bytesread = 0; break; }
                }
                if (bytesread < 1) continue;
                if (!entity.running) return;
                //读取数据,支持一帧分多次发送
                while (bytesread > 0)
                {
                    entity.dtread = DateTime.Now;
                    try
                    {
                        int len = client.Read(buffer, 0, buffer.Length);
                        byte[] buf = new byte[len];
                        Array.Copy(buffer, buf, len);
                        Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 接收：" + CommandBase.Parse(buf, true));
                        myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 接收：" + CommandBase.Parse(buf, true));
                        Monitor.Enter(entity);
                        try
                        {
                            this.joinToList(buffer, len, ref entity.buffer, list, target.Ptl);
                        }
                        catch (Exception ex) { ExceptionManager.Publish(ex); }
                        Monitor.PulseAll(entity);
                        Monitor.Exit(entity);
                        bytesread = client.BytesToRead;
                    }
                    catch (Exception ex)
                    {
                        if (!entity.running) return;
                        ExceptionManager.Publish(ex);
                        clientEntity = entity.Entity as ClientEntity<SerialPort>;
                        if (null != clientEntity && client == clientEntity.client)
                            this.closeSer(entity);
                        ErrorCommiEventArgs err = new ErrorCommiEventArgs(client, entity.target, null, ex);
                        this.raiseErrorRead(err);
                        break;
                    }
                    byte[][] responses = list.ToArray();
                    foreach(byte[] response in responses)
                    {
                        //触发响应事件
                        ResponseEventArgs arg = new ResponseEventArgs(client, target, entity.CmdList.ToArray(), response);
                        this.raiseResponse(entity, arg);
                    }
                    list.Clear();
                }//while (bytesread > 0)
            }//where(true)
            entity.running = false;
            entity.writewh.Set();
            this.closeSer(entity);
        }

        #endregion

        #region 处理事件

        /// <summary>
        /// 自定义XML报文格式
        /// </summary>
        private static byte[] beginXML = encodGB2312.GetBytes("<F");
        /// <summary>
        /// 触发响应事件,超限自动移除,其他需调用者维护移除
        /// </summary>
        /// <param name="arg">触发响应事件参数</param>
        private void raiseResponse(CommiEntity entity, ResponseEventArgs arg)
        {
            EventHandler<ResponseEventArgs> handle = this.ResponseHandle;
            //使用自定义委托检查当前指令
            if (null == arg.CurrentCommand)
            {
                foreach (CommandBase c in arg.Commands)
                {
                    if (null == c || null == c.IsResposeHandle)
                        continue;
                    if (!c.IsResposeHandle(c, arg.Response))
                        continue;
                    arg.CurrentCommand = c;
                    break;
                }
            }
            //确定合适的当前指令
            if (null == arg.CurrentCommand)
            {
                CommiTarget commips = arg.Target;
                Protocol ptl = commips.Ptl;
                int lenmin = 0;
                if (null != ptl)
                    lenmin = (ptl.KeyIndexStart < 0 ? ptl.FrameHeader.Length : ptl.KeyIndexStart) + ptl.KeyLength;
                int count = 0;
                CommandBase cmdtemp = null;
                if (1 == arg.Commands.Length)
                    arg.CurrentCommand = arg.Commands[0];
                else if (1 == entity.CmdList.Count)
                    arg.CurrentCommand = entity.CmdList[0];
                else if (CommiType.TCP == commips.ProtocolType || CommiType.UDP == commips.ProtocolType
                         || null == arg.Response || null == commips.Ptl || commips.Ptl.KeyLength < 1 || arg.Response.Length < lenmin)
                {
                    //当前只有一个在等待响应则确定当前指令
                    foreach (CommandBase c in arg.Commands)
                    {
                        if (null == c || CmdState.Response != c.CheckState())
                            continue;
                        cmdtemp = c;
                        count++;
                    }
                    if (1 == count)
                        arg.CurrentCommand = cmdtemp;
                }
                else if (CommiType.SerialPort == commips.ProtocolType)
                {
                    //在串口通讯,当前只有一个在等待响应则确定当前指令
                    //如果是串行执行则检查键值
                    int len = ptl.KeyLength;
                    int start = ptl.KeyIndexStart < 0 ? ptl.FrameHeader.Length : ptl.KeyIndexStart;
                    byte[] address = new byte[len];
                    byte[] addrcmd = new byte[len];
                    Array.Copy(arg.Response, start, address, 0, len);
                    foreach (CommandBase c in arg.Commands)
                    {
                        if (null == c || CmdState.Response != c.CheckState())
                            continue;
                        //检查指令
                        byte[] datacmd = null;
                        try { datacmd = c.getCommand(); }
                        catch (Exception ex)
                        {
                            ExceptionManager.Publish(ex);
                            continue;
                        }
                        if (null == datacmd || datacmd.Length < 1 || datacmd.Length < lenmin)
                            continue;
                        //检查指令是否相同
                        Array.Copy(datacmd, start, addrcmd, 0, len);
                        bool iscontinue = true;
                        for (int i = 0; i < len; i++)
                        {
                            if (address[i] == addrcmd[i])
                                continue;
                            iscontinue = false;
                            break;
                        }
                        if (iscontinue)
                            continue;
                        //相同则计数
                        cmdtemp = c;
                        count++;
                    }
                    if (1 == count)
                        arg.CurrentCommand = cmdtemp;
                }
            }//if (null == arg.CurrentCommand)
            //能够确定当前响应指令则执行
            CommandBase cmd = arg.CurrentCommand;
            if (null != cmd)
            {
                cmd.ResponseDatetime = DateTime.Now;
                if (cmd.SendDatetime == cmd.ResponseDatetime)
                    cmd.ResponseDatetime = cmd.ResponseDatetime.AddMilliseconds(1);
                CmdState state = cmd.CheckState();
                //执行完成移除
                if (CmdState.Completed == state)
                    this.RemoveCommand(arg.Target, cmd);
                //失败超限且后处理是退出则自动移除
                if (CmdState.TimeFailLimit == state && FailAftPro.Exit == cmd.FailProAf)
                    this.RemoveCommand(arg.Target, cmd);
            }
            if (null != handle)
                ThreadManager.QueueUserWorkItem(delegate(object obj) { handle(this, obj as ResponseEventArgs); }, arg);
            if (null != cmd)
            {
                //bool isxml = false;
                //if (null != arg.Response && arg.Response.Length > beginXML.Length)
                //    isxml = "<F" == encodGB2312.GetString(arg.Response, 0, beginXML.Length);
                //string msg = CommandBase.Parse(arg.Response, !isxml);
                //Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 事件：" + msg);
                //myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 事件：" + msg);
                //ThreadManager.QueueUserWorkItem(delegate(object obj) { cmd.RaiseResponse(arg as ResponseEventArgs); }, arg);
                DateTime dtNowhdl = DateTime.Now.AddSeconds(-30);
                if (CommiType.SerialPort == entity.target.ProtocolType)
                    cmd.RaiseResponse(arg);
                else if ("通道闸.采集" == cmd.DeviceType)
                {
                    Monitor.Enter(argsChannel);
                    argsChannel.Add(arg);
                    Monitor.PulseAll(argsChannel);
                    Monitor.Exit(argsChannel);
                    argWhChannel.Set();
                    if (argsChannel.Count < 5)
                        Thread.Sleep(1);
                    if (dtRunChannel<dtNowhdl)
                        ThreadManager.QueueUserWorkItem(raiseCmdChannel, null);
                }
                else if (!cmd.IsResponseHandle)
                {
                    Monitor.Enter(argsHandle);
                    argsHandle.Add(arg);
                    Monitor.PulseAll(argsHandle);
                    Monitor.Exit(argsHandle);
                    argWh.Set();
                    if (argsHandle.Count < 5)
                        Thread.Sleep(1);
                    if (dtRunHandle<dtNowhdl)
                        ThreadManager.QueueUserWorkItem(raiseCmdHandle, null);
                }
                else
                {
                    Monitor.Enter(argsHdl);
                    argsHdl.Add(arg);
                    Monitor.PulseAll(argsHdl);
                    Monitor.Exit(argsHdl);
                    argHdlWh.Set();
                    if (argsHdl.Count < 5)
                        Thread.Sleep(1);
                    if (dtRunHdl<dtNowhdl)
                        ThreadManager.QueueUserWorkItem(raiseCmdHdl, null);
                }
            }
        }

        #region 触发指令事件 (单线程,无响应事件)
        /// <summary>
        /// 指令事件参数列表
        /// </summary>
        private List<ResponseEventArgs> argsHandle = new List<ResponseEventArgs>();
        /// <summary>
        /// 是否正在执行指令事件
        /// </summary>
        private DateTime dtRunHandle = DateTime.MinValue;
        /// <summary>
        /// 同步执行指令事件
        /// </summary>
        private ManualResetEvent argWh = new ManualResetEvent(false);
        /// <summary>
        /// 触发指令事件
        /// </summary>
        /// <param name="obj"></param>
        private void raiseCmdHandle(object obj)
        {
            dtRunHandle = DateTime.Now;
            while (true)
            {
                Monitor.Enter(argsHandle);
                ResponseEventArgs[] args = argsHandle.ToArray();
                argsHandle.Clear();
                if (args.Length < 1)
                    dtRunHandle = DateTime.MinValue;
                Monitor.PulseAll(argsHandle);
                Monitor.Exit(argsHandle);
                if (args.Length < 1)
                    break;
                foreach (ResponseEventArgs arg in args)
                {
                    if (null == arg || null == arg.CurrentCommand)
                        continue;
                    CommandBase cmd = arg.CurrentCommand;
                    if (myLog.IsLog)
                    {
                        byte[] barg = null != arg.Response ? arg.Response : new byte[0];
                        bool isxml = false;
                        if (barg.Length > beginXML.Length)
                            isxml = "<F" == encodGB2312.GetString(barg, 0, beginXML.Length);
                        string msg = CommandBase.Parse(barg, !isxml);
                        Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 事无：" + msg);
                        myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 事无：" + msg);
                    }
                    try { cmd.RaiseResponse(arg); }
                    catch (Exception ex) { ExceptionManager.Publish(ex); }
                }
                argWh.Reset();
                for (int i = 0; i < 1000; i++)
                {
                    if (argsHandle.Count > 0)
                        break;
                    dtRunHandle = DateTime.Now;
                    argWh.WaitOne(10);
                }
            }
        }
        #endregion

        #region 触发指令事件 (单线程,有响应事件)
        /// <summary>
        /// 指令事件参数列表
        /// </summary>
        private List<ResponseEventArgs> argsHdl = new List<ResponseEventArgs>();
        /// <summary>
        /// 是否正在执行指令事件
        /// </summary>
        private DateTime dtRunHdl = DateTime.MinValue;
        /// <summary>
        /// 同步执行指令事件
        /// </summary>
        private ManualResetEvent argHdlWh = new ManualResetEvent(false);
        /// <summary>
        /// 触发指令事件
        /// </summary>
        /// <param name="obj"></param>
        private void raiseCmdHdl(object obj)
        {
            dtRunHdl = DateTime.Now;
            while (true)
            {
                Monitor.Enter(argsHdl);
                ResponseEventArgs[] args = argsHdl.ToArray();
                argsHdl.Clear();
                if (args.Length < 1)
                    dtRunHdl = DateTime.MinValue;
                Monitor.PulseAll(argsHdl);
                Monitor.Exit(argsHdl);
                if (args.Length < 1)
                    break;
                foreach (ResponseEventArgs arg in args)
                {
                    if (null == arg || null == arg.CurrentCommand)
                        continue;
                    CommandBase cmd = arg.CurrentCommand;
                    if (myLog.IsLog)
                    {
                        byte[] barg = null != arg.Response ? arg.Response : new byte[0];
                        bool isxml = false;
                        if (barg.Length > beginXML.Length)
                            isxml = "<F" == encodGB2312.GetString(barg, 0, beginXML.Length);
                        string msg = CommandBase.Parse(barg, !isxml);
                        Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 事响：" + msg);
                        myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 事响：" + msg);
                    }
                    try { cmd.RaiseResponse(arg); }
                    catch (Exception ex) { ExceptionManager.Publish(ex); }
                }
                argHdlWh.Reset();
                for (int i = 0; i < 1000; i++)
                {
                    if (argsHdl.Count > 0)
                        break;
                    dtRunHdl = DateTime.Now;
                    argHdlWh.WaitOne(10);
                }
            }
        }
        #endregion

        #region 触发指令事件 (单线程,通道闸巡检设备)
        /// <summary>
        /// 指令事件参数列表
        /// </summary>
        private List<ResponseEventArgs> argsChannel = new List<ResponseEventArgs>();
        /// <summary>
        /// 是否正在执行指令事件
        /// </summary>
        private DateTime dtRunChannel = DateTime.MinValue;
        /// <summary>
        /// 同步执行指令事件
        /// </summary>
        private ManualResetEvent argWhChannel = new ManualResetEvent(false);
        /// <summary>
        /// 触发指令事件
        /// </summary>
        /// <param name="obj"></param>
        private void raiseCmdChannel(object obj)
        {
            dtRunChannel = DateTime.Now;
            while (true)
            {
                Monitor.Enter(argsChannel);
                ResponseEventArgs[] args = argsChannel.ToArray();
                argsChannel.Clear();
                if (args.Length < 1)
                    dtRunChannel = DateTime.MinValue;
                Monitor.PulseAll(argsChannel);
                Monitor.Exit(argsChannel);
                if (args.Length < 1)
                    break;
                foreach (ResponseEventArgs arg in args)
                {
                    if (null == arg || null == arg.CurrentCommand)
                        continue;
                    CommandBase cmd = arg.CurrentCommand;
                    if (myLog.IsLog)
                    {
                        byte[] barg = null != arg.Response ? arg.Response : new byte[0];
                        bool isxml = false;
                        if (barg.Length > beginXML.Length)
                            isxml = "<F" == encodGB2312.GetString(barg, 0, beginXML.Length);
                        string msg = CommandBase.Parse(barg, !isxml);
                        Debug.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 事闸：" + msg);
                        myLog.WriteLine(DateTime.Now.ToString("HH:mm:ss.fff") + " 事闸：" + msg);
                    }
                    try { cmd.RaiseResponse(arg); }
                    catch (Exception ex) { ExceptionManager.Publish(ex); }
                }
                argWhChannel.Reset();
                for (int i = 0; i < 1000; i++)
                {
                    if (argsChannel.Count > 0)
                        break;
                    dtRunChannel = DateTime.Now;
                    argWhChannel.WaitOne(10);
                }
            }
        }
        #endregion
        /// <summary>
        /// 触发异常事件
        /// </summary>
        /// <param name="arg">引发异常的参数</param>
        private void raiseError(ErrorCommiEventArgs arg)
        {
            EventHandler<ErrorCommiEventArgs> handle = this.ErrorCommiHandle;
            if (null != handle)
                ThreadManager.QueueUserWorkItem(delegate(object obj) { handle(this, obj as ErrorCommiEventArgs); }, arg);
        }
        /// <summary>
        /// 触发异常事件
        /// </summary>
        /// <param name="arg">引发异常的参数</param>
        private void raiseErrorOpen(ErrorCommiEventArgs arg)
        {
            this.raiseError(arg);
            EventHandler<ErrorCommiEventArgs> handle = this.ErrorOpenHandle;
            if (null != handle)
                ThreadManager.QueueUserWorkItem(delegate(object obj) { handle(this, obj as ErrorCommiEventArgs); }, arg);
        }
        /// <summary>
        /// 触发异常事件
        /// </summary>
        /// <param name="arg">引发异常的参数</param>
        private void raiseErrorWrite(ErrorCommiEventArgs arg)
        {
            this.raiseError(arg);
            EventHandler<ErrorCommiEventArgs> handle = this.ErrorWriteHandle;
            if (null != handle)
                ThreadManager.QueueUserWorkItem(delegate(object obj) { handle(this, obj as ErrorCommiEventArgs); }, arg);
        }
        /// <summary>
        /// 触发异常事件
        /// </summary>
        /// <param name="arg">引发异常的参数</param>
        private void raiseErrorRead(ErrorCommiEventArgs arg)
        {
            this.raiseError(arg);
            EventHandler<ErrorCommiEventArgs> handle = this.ErrorReadHandle;
            if (null != handle)
                ThreadManager.QueueUserWorkItem(delegate(object obj) { handle(this, obj as ErrorCommiEventArgs); }, arg);
        }
        #endregion


    }//end CommiManager

}//end namespace Granity.communications