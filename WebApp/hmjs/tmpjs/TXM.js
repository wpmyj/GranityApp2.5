

//�����Ҫ�е��ֶ�:���ݱ��,�����ı�
//��ϸ��Ҫ�е��ֶ�:XS,S,M,L,XL,XXL,XXX;XS_T,S_T,M_T,L_T,XL_T,XXL_T,XXX_T;�����ɫ����;
//itemNameD������ϸ��;itemNameT�������;strcols:��ϸ��¼Ҫ��¼��������ֶ�:���,��ɫ����,���ۼ۸�,�ɹ�����,�ۿ�
function ue_addTXM(itemNameD,itemNameT,strcols,srcsuf,destsuf,isRefreshTXM)
{
	if(event.keyCode!=13)	return;
	var inputctrl=event.srcElement;
	inputctrl.select();
	var strAlertMsg="";
	var mediaPlay=document.getElementById("MyMedia");
	if(srcsuf=="undefined" || !srcsuf || ''==srcsuf)
	     srcsuf="";
	if(!destsuf || ''==destsuf || destsuf=="undefined")
	    destsuf="_T";
	var strcodeTM=transCode12(inputctrl.value);

    //�����Ƿ�ִ������ɨ��
	var bandPD=document.UnitItem.getBandByItemName(itemNameD);
    var validatExp=inputctrl.getAttribute("validatexp");
    if(validatExp && ""!=validatExp)
    {
        var val=bandPD.getExpValue(validatExp);
        if(false==val)
        {
		    strAlertMsg="��ͨ��У��";
		    mediaPlay.FileName="Error.wav";
		    mediaPlay.Play();
		    return;
        }
    }
	
	//�������ݶ�band
	var band=document.UnitItem.getBandByItemName(itemNameT);
	if(band.RecordCount()<1)
	    band.NewRecord();
	if(band.RecordCount()<1)
	    return;
	var xmlNodeTM=band.XmlLandData.XMLDocument.selectSingleNode("/*/*/�����ı�");
    var re=new RegExp("\\b"+strcodeTM+"\\b","ig");
	if(xmlNodeTM.text.search(re)>-1)
	{
		strAlertMsg="�����ظ�";
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return;
	}
	//�����ɫ����,�������
	var strCodeKC=strcodeTM.substr(0,6);
	var strCodeSize=strcodeTM.substr(7,1);
	var colNameSize="";
	if('1'==strCodeSize)	colNameSize="XS";
	if('2'==strCodeSize)	colNameSize="S";
	if('3'==strCodeSize)	colNameSize="M";
	if('4'==strCodeSize)	colNameSize="L";
	if('5'==strCodeSize)	colNameSize="XL";
	if('6'==strCodeSize)	colNameSize="XXL";
	if('7'==strCodeSize)	colNameSize="XXXL";
	if('8'==strCodeSize)	colNameSize="XXXXL";
	if(""==colNameSize)
	{
		strAlertMsg="û���������ı��";
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return;
	}
	
	//����ϸ����������У��
	//��ϸ�������ݶ�
	if(!bandPD.xmlGroupSum)
	{
	    var xsldiv=document.createElement("DIV");
	    document.body.appendChild(xsldiv);
	    xsldiv.innerHTML="<XML></XML>";
	    xsldiv.style.display="none";
	    bandPD.xmlGroupSum=xsldiv.firstChild;
	}
	var strGroupSum=bandPD.GroupSum("�����ɫ����");
	if(strGroupSum=="") strGroupSum=bandPD.GroupSum("����");
	bandPD.xmlGroupSum.XMLDocument.loadXML(strGroupSum);
	var xmlDocSum=bandPD.xmlGroupSum.XMLDocument;
	var strXPath="/*/*[�����ɫ����='"+strCodeKC+"']/"+colNameSize+srcsuf;
	if(strXPath=="")
	    strXPath="/*/*[����='"+strCodeKC+"']/"+colNameSize+srcsuf;
	var xmld=xmlDocSum.selectSingleNode(strXPath);
	var max=ToolUtil.Convert((!xmld)?"0":xmld.text, "int");

    //�����ɫ�������,ͬ�����ɫ��������
    var strcode=strcodeTM.substr(0,8);
    var re=new RegExp("\\b"+strcode,"ig");
    var arryKCS=xmlNodeTM.text.match(re);
	var iCountT=(!arryKCS)?1:arryKCS.length+1;
	if(iCountT>max)
	{
		strAlertMsg="��������";
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return;
	}
	//�������������1
	//���ݱ��;�ͻ�����;�ɹ�����;�ۿ۽��;(�����¼������Ϣ)
	var strDJBH="";var rowIndex=-1;
	for(var i=0;i<bandPD.XmlLandData.recordset.recordCount;i++)
	{
	    var strValueK=bandPD.getFldStrValue("�����ɫ����",i);
	    if(strValueK=="")
	        strValueK=bandPD.getFldStrValue("����",i);
	    if(strValueK!=strCodeKC)    continue;
	    var strValueSize=bandPD.getFldStrValue(colNameSize+srcsuf,i);
	    var strValueSizeT=bandPD.getFldStrValue(colNameSize+destsuf,i);
	    if(strValueSize==strValueSizeT)     continue;
	    
	    var ivalue=ToolUtil.Convert(strValueSize,"int");
	    var ivalueT=ToolUtil.Convert(strValueSizeT,"int");
	    if(ivalue<=ivalueT)     continue;
	    strDJBH=bandPD.getFldStrValue("���ݱ��",i);
	    rowIndex=i;
	    //����ÿ����ɫֻ��һ����¼,��ô���������������������ȷ��;����ֻ������һ
	    var xmlNodesTest=bandPD.XmlLandData.XMLDocument.selectNodes("/*/*[�����ɫ����='"+strCodeKC+"']");
	    if(!xmlNodesTest)
	        xmlNodesTest=bandPD.XmlLandData.XMLDocument.selectNodes("/*/*[����='"+strCodeKC+"']");
	    if(xmlNodesTest.length>1)
	        bandPD.setFldStrValue(i,colNameSize+destsuf,ivalueT+1);
	    else
	        bandPD.setFldStrValue(i,colNameSize+destsuf,iCountT);
        if(isRefreshTXM)
        {
	        bandPD.setFldStrValue(i,"����",strcodeTM);
	        bandPD.setSelectContent("����",i);
	    }
	    bandPD.CalXmlLand.Calculate(i);
	    break;
	}
    if(bandPD.Grid) bandPD.Grid.Sum();
    else    bandPD.Sum();
	if(""==strDJBH) return;
	
	//������ϸ�����������¼
	//�����ı������µ�����,���,��ɫ,������Ϣ
	var strCols=(!strcols)?(new Array()):strcols.split(",");
	if(""==xmlNodeTM.text)
	{
	    var strTMInfo = "\n����\t\t";
	    for(var i=0;i<strCols.length;i++)
	        if(strCols[i] && ""!=strCols[i])
	            strTMInfo += strCols[i]+"\t";
	    xmlNodeTM.text=strTMInfo;
	}
	var strTMInfo="";
	for(var i=0;i<strCols.length;i++)
	    if(strCols[i] && ""!=strCols[i])
	    {
	        if("����"==strCols[i] || "��������"==strCols[i])
	            strTMInfo += colNameSize+"\t";
	        else
	            strTMInfo += bandPD.getFldStrValue(strCols[i],rowIndex)+"\t";
	    }
	xmlNodeTM.text += "\n"+strcodeTM+"\t"+strTMInfo;
    var strState=xmlNodeTM.parentNode.getAttribute("state");
    if(!strState || ""==strState)
        xmlNodeTM.parentNode.setAttribute("state","modify");

}

//�����Ҫ�е��ֶ�:���ݱ��,�����ı�
//��ϸ��Ҫ�е��ֶ�:XS,S,M,L,XL,XXL,XXX;XS_T,S_T,M_T,L_T,XL_T,XXL_T,XXX_T;�����ɫ����
//itemNameD������ϸ��;itemNameT�������;strcols�ֶ��б�,��ϸ��¼Ҫ��¼��������ϸ���ֶ�: ���,��ɫ����,���ۼ۸�,�ɹ�����
//�����г�����ʾ����
function ue_addTXMN(itemNameD,itemNameT,strcols,srcsuf,destsuf)
{
	if(event.keyCode!=13)	return;
	var inputctrl=event.srcElement;
	inputctrl.select();
	var strAlertMsg="";
	var mediaPlay=document.getElementById("MyMedia");
	if(!srcsuf)     srcsuf="";
	if(!destsuf)    destsuf="_T";
	
	var strcodeTM=transCode12(inputctrl.value);

    //�����Ƿ�ִ������ɨ��
	var bandPD=document.UnitItem.getBandByItemName(itemNameD);
    var validatExp=inputctrl.getAttribute("validatexp");
    if(validatExp && ""!=validatExp)
    {
        var val=bandPD.getExpValue(validatExp);
        if(false==val)
        {
		    strAlertMsg="��ͨ��У��";
		    mediaPlay.FileName="Error.wav";
		    mediaPlay.Play();
		    return;
        }
    }

	//�������ݶ�band
	var band=document.UnitItem.getBandByItemName(itemNameT);
	if(band.RecordCount()<1)
	    band.NewRecord();
	if(band.RecordCount()<1)
	    return;
	var xmlNodeTM=band.XmlLandData.XMLDocument.selectSingleNode("/*/*/�����ı�");
    var re=new RegExp("\\b"+strcodeTM+"\\b","ig");
	if(xmlNodeTM.text.search(re)>-1)
	{
		strAlertMsg="�����ظ�";
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return;
	}
	//�����ɫ����,�������
	var strCodeKC=strcodeTM.substr(0,6);
	var strCodeSize=strcodeTM.substr(7,1);
	var colNameSize="";
	if('1'==strCodeSize)	colNameSize="XS";
	if('2'==strCodeSize)	colNameSize="S";
	if('3'==strCodeSize)	colNameSize="M";
	if('4'==strCodeSize)	colNameSize="L";
	if('5'==strCodeSize)	colNameSize="XL";
	if('6'==strCodeSize)	colNameSize="XXL";
	if('7'==strCodeSize)	colNameSize="XXXL";
	if(""==colNameSize)
	{
		strAlertMsg="û���������ı��";
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return;
	}
	
	//����ϸ����������У��
	//��ϸ�������ݶ�
	var bandPD=document.UnitItem.getBandByItemName(itemNameD);
	if(!bandPD.xmlGroupSum)
	{
	    var xsldiv=document.createElement("DIV");
	    document.body.appendChild(xsldiv);
	    xsldiv.innerHTML="<XML></XML>";
	    xsldiv.style.display="none";
	    bandPD.xmlGroupSum=xsldiv.firstChild;
	}
	var strGroupSum=bandPD.GroupSum("�����ɫ����");
	bandPD.xmlGroupSum.XMLDocument.loadXML(strGroupSum);
	var xmlDocSum=bandPD.xmlGroupSum.XMLDocument;
	var strXPath="/*/*[�����ɫ����='"+strCodeKC+"']/"+colNameSize+srcsuf;
	var xmld=xmlDocSum.selectSingleNode(strXPath);

    //�����ɫ�������,ͬ�����ɫ��������
    var strcode=strcodeTM.substr(0,8);
    var re=new RegExp("\\b"+strcode,"ig");
    var arryKCS=xmlNodeTM.text.match(re);
	var iCountT=(!arryKCS)?1:arryKCS.length+1;
	//�������������1
	//���ݱ��;�ͻ�����;�ɹ�����;�ۿ۽��;(�����¼������Ϣ)
	var strDJBH="";var rowIndex=-1;
	for(var i=0;i<bandPD.XmlLandData.recordset.recordCount;i++)
	{
	    var strValueK=bandPD.getFldStrValue("�����ɫ����",i);
	    if(strValueK!=strCodeKC)    continue;
	    var strValueSize=bandPD.getFldStrValue(colNameSize+srcsuf,i);
	    var strValueSizeT=bandPD.getFldStrValue(colNameSize+destsuf,i);
	    //���̵�ʱ����Ҫ��������ɨ��������
	    //if(strValueSize==strValueSizeT)     continue;
	    
	    var ivalue=ToolUtil.Convert(strValueSize,"int");
	    var ivalueT=ToolUtil.Convert(strValueSizeT,"int");
	    //if(ivalue<=ivalueT)     continue;
	    strDJBH=bandPD.getFldStrValue("���ݱ��",i);
	    rowIndex=i;
	    //����ÿ����ɫֻ��һ����¼,��ô���������������������ȷ��;����ֻ������һ
	    var xmlNodesTest=bandPD.XmlLandData.XMLDocument.selectNodes("/*/*[�����ɫ����='"+strCodeKC+"']");
	    if(xmlNodesTest.length>1)
	        bandPD.setFldStrValue(i,colNameSize+destsuf,ivalueT+1);
	    else
	        bandPD.setFldStrValue(i,colNameSize+destsuf,iCountT);
	    bandPD.CalXmlLand.Calculate(i);
	    break;
	}
	bandPD.Grid.Sum();
	if(""==strDJBH) return;
	
	//������ϸ�����������¼
	//�����ı������µ�����,���,��ɫ,������Ϣ
	var strCols=(!strcols)?(new Array()):strcols.split(",");
	if(""==xmlNodeTM.text)
	{
	    var strTMInfo = "\n����\t\t";
	    for(var i=0;i<strCols.length;i++)
	        if(strCols[i] && ""!=strCols[i])
	            strTMInfo += strCols[i]+"\t";
	    xmlNodeTM.text=strTMInfo;
	}
	var strTMInfo="";
	for(var i=0;i<strCols.length;i++)
	    if(strCols[i] && ""!=strCols[i])
	    {
	        if("����"==strCols[i] || "��������"==strCols[i])
	            strTMInfo += colNameSize+"\t";
	        else
	            strTMInfo += bandPD.getFldStrValue(strCols[i],rowIndex)+"\t";
	    }
	xmlNodeTM.text += "\n"+strcodeTM+"\t"+strTMInfo;
    var strState=xmlNodeTM.parentNode.getAttribute("state");
    if(!strState || ""==strState)
        xmlNodeTM.parentNode.setAttribute("state","modify");

}

//У������,����12λ����,������ɨ��ǹ����ǰ��0,�Լ�����13λ��Ʒ��Ĵ���
//ˢ��������,���ɶ�Ӧ�Ŀ�ų��뵥�ݼ�¼��ʽ,���������12λ,�������һλ��У�����
//��Ϊ����ռ��λ,���Ե�6λһ����0
//��Ҫ�����˳�������λ��,��һλ��0���ص�
//��Ч��,����""
function  transCode12(strcode)
{
	var strOrgTM=strcode;
	var strAlertMsg="";
	
	if(13==strOrgTM.length)
	    strOrgTM=strOrgTM.substr(0,12);
	else if(12>strOrgTM.length)
	{
	    if("0"==strOrgTM.substr(strOrgTM.length-6,1))
	        strOrgTM=("0000"+strOrgTM).substr(strOrgTM.length-8,12);
	    else
	        strOrgTM=("0000"+strOrgTM).substr(strOrgTM.length-9,12);
	}
	if(12==strOrgTM.length && "0"!=strOrgTM.substr(6,1))
	    strOrgTM=("0"+strOrgTM).substr(0,12);
    else if(12!=strOrgTM.length)
    {
	    var mediaPlay=document.getElementById("MyMedia");
		var strAlertMsg="�쳣����";
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return "";
    }
    return strOrgTM;
}

//�µķ�ʽ������Դ��ı���ʽ���,��̨����Ϊԭ���ļ�¼��ʽ���
//���ı���ŵķ�ʽ�е��ֶ�:���ݱ��,�����ı�
//�µķ�ʽ�����ʹ���ı�������ʵ��,�ı���ֻ��,����ֻ�����Ӻ�ɾ��;�������������ʾ���ı���
//��ϸ��Ҫ�е��ֶ�:XS,S,M,L,XL,XXL,XXX;�����ɫ����;
//itemNameD������ϸ��;itemNameT�������;fldsuffix�����ֶεĺ�׺�ַ�:��:"_T"
//strcols��Ҫ�����ı���¼���ֶ�;isRefreshTXM�Ƿ����ÿһ�����붼��������"����"�ֶ�,Ĭ��false����Ҫ
function ue_addTXM2DJ(itemNameD,itemNameT,fldsuffix,strcols,isRefreshTXM)
{
	if(event.keyCode!=13)	return;
	var inputctrl=event.srcElement;
	inputctrl.select();
	var strcodeTM=transCode12(inputctrl.value);

    if(!fldsuffix)  fldsuffix="";
	var strAlertMsg="";
	var mediaPlay=document.getElementById("MyMedia");
	//�������ݶ�band
	var band=document.UnitItem.getBandByItemName(itemNameT);
	if(band.RecordCount()<1)
	    band.NewRecord();
	if(band.RecordCount()<1)
	    return;
	var xmlNodeTM=band.XmlLandData.XMLDocument.selectSingleNode("/*/*/�����ı�");
    var re=new RegExp("\\b"+strcodeTM+"\\b","ig");
	if(xmlNodeTM.text.search(re)>-1)
	{
		var strAlertMsg="�����ظ�";
		inputctrl.select();
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return;
	}
	//�����ɫ����,�������
	var strCodeKC=strcodeTM.substr(0,6);
	var strCodeSize=strcodeTM.substr(7,1);
	var colNameSize="";
	if('1'==strCodeSize)	colNameSize="XS";
	if('2'==strCodeSize)	colNameSize="S";
	if('3'==strCodeSize)	colNameSize="M";
	if('4'==strCodeSize)	colNameSize="L";
	if('5'==strCodeSize)	colNameSize="XL";
	if('6'==strCodeSize)	colNameSize="XXL";
	if('7'==strCodeSize)	colNameSize="XXXL";
	if(""==colNameSize)
	{
		strAlertMsg="û���������ı��";
		inputctrl.select();
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return;
	}
	//��ϸ�����ֶ�
	var strSize=colNameSize;
	colNameSize=colNameSize+fldsuffix;
    
	//��ϸ�������ݶ�,���������,�]�ж�Ӧ�����ɫ�������¼�¼
	var bandPD=document.UnitItem.getBandByItemName(itemNameD);
	var strXPath="/*/*[�����ɫ����='"+strCodeKC+"']/"+colNameSize;
	var xmld=bandPD.XmlLandData.XMLDocument.documentElement.selectSingleNode(strXPath);
	if(xmld)
	{
	    var rowIndex=-1;
	    for(var i=0;i<bandPD.XmlLandData.XMLDocument.documentElement.childNodes.length;i++)
	    {
	        if(xmld.parentNode==bandPD.XmlLandData.XMLDocument.documentElement.childNodes[i])
	        {
	            rowIndex=i;break;
	        }
	    }
	    //�����ɫ�������,ͬ�����ɫ��������
	    var strcode=strcodeTM.substr(0,8);
	    var re=new RegExp("\\b"+strcode,"ig");
        var arryKCS=xmlNodeTM.text.match(re);
        if(isRefreshTXM)
        {
	        bandPD.setFldStrValue(rowIndex,"����",strcodeTM);
	        bandPD.setSelectContent("����",rowIndex);
	    }
	    bandPD.setFldStrValue(rowIndex,xmld.baseName,(!arryKCS)?1:arryKCS.length+1);
	    bandPD.CalXmlLand.Calculate(rowIndex);
	}else{
	    //�ҵ�һ��ԭ�����еļ�¼
	    var rowIndex=-1;
	    for(var i=0;i<bandPD.XmlLandData.XMLDocument.documentElement.childNodes.length;i++)
	    {
	        var strKHYS=bandPD.getFldStrValue("�����ɫ����",i);
	        if(!strKHYS || ""==strKHYS)
	        { rowIndex=i;break;}
	    }
	    if(rowIndex<0)
	    {
	        bandPD.NewRecord();
	        rowIndex=bandPD.XmlLandData.recordset.recordCount-1;
		    if(bandPD.Grid)
		        bandPD.Grid.setRowCursor();
		    bandPD.setCurrentRow(rowIndex);
	    }
	    bandPD.setFldStrValue(rowIndex,"����",strcodeTM);
	    bandPD.setSelectContent("����",rowIndex);
	    //�����,��ɫ�Ƿ���Ч
	    var strKHYS=bandPD.getFldStrValue("�����ɫ����",rowIndex);
	    if(!strKHYS || ""==strKHYS)
	    {
	        //���,��ɫ��Ч,�ü�¼����Ϊ�ռ�¼
	        bandPD.setFldStrValue(rowIndex,"����","");
		    strAlertMsg="���,��ɫ������Ч";
		    inputctrl.select();
		    mediaPlay.FileName="Error.wav";
		    mediaPlay.Play();
		    return;
	    }
	    bandPD.setFldStrValue(rowIndex,colNameSize,1);
	    bandPD.CalXmlLand.Calculate(rowIndex);
	}
	bandPD.Grid.Sum();
	
	//�����ı������µ�����,���,��ɫ,������Ϣ
	var strCols=(!strcols)?(new Array()):strcols.split(",");
	if(""==xmlNodeTM.text)
	{
	    var strTMInfo = "\n����\t\t";
	    for(var i=0;i<strCols.length;i++)
	        if(strCols[i] && ""!=strCols[i])
	            strTMInfo += strCols[i]+"\t";
	    xmlNodeTM.text=strTMInfo;
	}
	var strTMInfo="";
	for(var i=0;i<strCols.length;i++)
	    if(strCols[i] && ""!=strCols[i])
	    {
	        if("����"==strCols[i] || "��������"==strCols[i])
	            strTMInfo += colNameSize+"\t";
	        else
	            strTMInfo += bandPD.getFldStrValue(strCols[i],rowIndex)+"\t";
	    }
	xmlNodeTM.text += "\n"+strcodeTM+"\t"+strTMInfo;
    var strState=xmlNodeTM.parentNode.getAttribute("state");
    if(!strState || ""==strState)
        xmlNodeTM.parentNode.setAttribute("state","modify");
}

//ԭ����ʽ
//ˢ��������,���ɶ�Ӧ�Ŀ�ų��뵥�ݼ�¼��ʽ
//�����Ҫ�е��ֶ�:�����ɫ��������,��Ʒ����,��Ʒ�����
//��ϸ��Ҫ�е��ֶ�:XS,S,M,L,XL,XXL,XXX;�����ɫ����;�����ɫ�����
//itemNameD������ϸ��;itemNameT�������;fldsuffix�����ֶεĺ�׺�ַ�:��:"_T"
function XXue_addTXM2DJ(itemNameD,itemNameT,fldsuffix)
{
	if(event.keyCode!=13)	return;
	var inputctrl=event.srcElement;
	var strOrgTM=inputctrl.value;
	
	if(13==inputctrl.value.length)
	    strOrgTM=inputctrl.value.substr(0,12);
	else if(12>inputctrl.value.length)
	    strOrgTM=("0000"+inputctrl.value).substr(inputctrl.value.length-9,12);
	else if(12==inputctrl.value.length && "0"!=inputctrl.value.substr(6,1))
	    strOrgTM=("0"+inputctrl.value).substr(0,12);
	if(12==strOrgTM.length)
	    var strcodeTM=transNew14Data(strOrgTM);
	else
	    var strcodeTM=strOrgTM;
	if(""==strcodeTM || 14!=strcodeTM.length)
	   return;
    if(!fldsuffix)  fldsuffix="";
	var strAlertMsg="";
	var mediaPlay=document.getElementById("MyMedia");
	//�������ݶ�band
	var band=document.UnitItem.getBandByItemName(itemNameT);
	var xmlNodeTest=band.XmlLandData.XMLDocument.documentElement.selectSingleNode("/*/*[��Ʒ����='"+strcodeTM+"']");
	if(xmlNodeTest && "0000"!=strcodeTM.substr(10,4))
	{
		var strAlertMsg="�����ظ�";
		inputctrl.select();
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return;
	}
	var strcode=strcodeTM.substr(0,10);
	var strXPath="/*/*[�����ɫ��������='"+strcode+"']";
	//�����ɫ����,�������
	var strCodeKC=strcodeTM.substr(0,9);
	var strCodeSize=strcodeTM.substr(9,1);
	var colNameSize="";
	if('1'==strCodeSize)	colNameSize="XS";
	if('2'==strCodeSize)	colNameSize="S";
	if('3'==strCodeSize)	colNameSize="M";
	if('4'==strCodeSize)	colNameSize="L";
	if('5'==strCodeSize)	colNameSize="XL";
	if('6'==strCodeSize)	colNameSize="XXL";
	if('7'==strCodeSize)	colNameSize="XXXL";
	if(""==colNameSize)
	{
		strAlertMsg="û���������ı��";
		inputctrl.select();
		mediaPlay.FileName="Error.wav";
		mediaPlay.Play();
		return;
	}
	colNameSize=colNameSize+fldsuffix;
	var xmlnodes=band.XmlLandData.XMLDocument.documentElement.selectNodes(strXPath);

	strXPath="/*/*[�����ɫ����='"+strCodeKC+"']/"+colNameSize;
	//��ϸ�������ݶ�,���������,�]�ж�Ӧ�����ɫ�������¼�¼
	var bandPD=myUnitItem.getBandByItemName(itemNameD);
	var xmld=bandPD.XmlLandData.XMLDocument.documentElement.selectSingleNode(strXPath);
	if(xmld)
	{
	    var rowIndex=-1;
	    for(var i=0;i<bandPD.XmlLandData.XMLDocument.documentElement.childNodes.length;i++)
	    {
	        if(xmld.parentNode==bandPD.XmlLandData.XMLDocument.documentElement.childNodes[i])
	        {
	            rowIndex=i;break;
	        }
	    }
	    bandPD.setFldStrValue(rowIndex,xmld.baseName,xmlnodes.length+1);
	    bandPD.CalXmlLand.Calculate(rowIndex);
	}else{
	    //�ҵ�һ��ԭ�����еļ�¼
	    var rowIndex=-1;
	    for(var i=0;i<bandPD.XmlLandData.XMLDocument.documentElement.childNodes.length;i++)
	    {
	        var strKHYS=bandPD.getFldStrValue("�����ɫ����",i);
	        if(!strKHYS || ""==strKHYS)
	        { rowIndex=i;break;}
	    }
	    if(rowIndex<0)
	    {
	        bandPD.NewRecord();
	        rowIndex=bandPD.XmlLandData.recordset.recordCount-1;
		    if(bandPD.Grid)
		        bandPD.Grid.setRowCursor();
		    bandPD.setCurrentRow(rowIndex);
	    }
	    bandPD.setFldStrValue(rowIndex,"����",strcodeTM);
	    bandPD.setSelectContent("����",rowIndex);
	    //�����,��ɫ�Ƿ���Ч
	    var strKHYS=bandPD.getFldStrValue("�����ɫ����",rowIndex);
	    if(!strKHYS || ""==strKHYS)
	    {
	        //���,��ɫ��Ч,�ü�¼����Ϊ�ռ�¼
	        bandPD.setFldStrValue(rowIndex,"����","");
		    strAlertMsg="���,��ɫ������Ч";
		    inputctrl.select();
		    mediaPlay.FileName="Error.wav";
		    mediaPlay.Play();
		    return;
	    }
	    bandPD.setFldStrValue(rowIndex,colNameSize,1);
	    bandPD.CalXmlLand.Calculate(rowIndex);
	}
	bandPD.Grid.Sum();
	band.NewRecord();
	band.setCurrentRow();
	band.setFldStrValue(band.XmlLandData.recordset.recordCount-1,"��Ʒ����",strcodeTM);
	band.setSelectContent("��Ʒ����",null);
	band.CalXmlLand.Calculate();
	if(12==strOrgTM.length)
	    band.setFldStrValue(band.XmlLandData.recordset.recordCount-1,"��Ʒ�����",strOrgTM);
	inputctrl.select();
}


//�µķ�ʽ������Դ��ı���ʽ���,��̨����Ϊԭ���ļ�¼��ʽ���
//���ı���ŵķ�ʽ�е��ֶ�:���ݱ��,�����ı�
//�µķ�ʽ�����ʹ���ı�������ʵ��,�ı���ֻ��,����ֻ�����Ӻ�ɾ��;�������������ʾ���ı���
//��ϸ��Ҫ�е��ֶ�:XS,S,M,L,XL,XXL,XXX;�����ɫ����;
//itemNameD������ϸ��;itemNameT�������;fldsuffix�����ֶεĺ�׺�ַ�:��:"_T"
//strcols��Ҫ�����ı���¼���ֶ�;isRefreshTXM�Ƿ����ÿһ�����붼��������"����"�ֶ�,Ĭ��false����Ҫ
//���������ı�ˢ�¼��㵥����ϸ����
function ue_TXMCalDJ(itemNameD,itemNameT,fldsuffix)
{
	//�������ݶ�band
	var band=document.UnitItem.getBandByItemName(itemNameT);
	if(band.RecordCount()<1)    return;
	var fldsuffix=fldsuffix?fldsuffix:'';
	var xmlNodeTM=band.XmlLandData.XMLDocument.selectSingleNode("/*/*/�����ı�");
 	//��ϸ�������ݶ�,���������,�]�ж�Ӧ�����ɫ�������¼�¼
	var bandPD=document.UnitItem.getBandByItemName(itemNameD);
    
    var arrySize=new Array("S","M","L","XL","XXL","XXXL");
    var icount=bandPD.RecordCount();
    for(var i=0;i<icount;i++)
    {
        var strCodeKC=bandPD.getFldStrValue("�����ɫ����",i);
        for(var j=0;j<arrySize.length;j++)
        {
	        //�����ɫ�������,ͬ�����ɫ��������
	        var strXPath="/*/*[�����ɫ����='"+strCodeKC+"']/"+arrySize[j]+fldsuffix;
	        var xmld=bandPD.XmlLandData.XMLDocument.documentElement.selectSingleNode(strXPath);
	        if(!xmld)   continue;
	        var strcode=strCodeKC+'0'+(j+2);
	        var re=new RegExp("\\b"+strcode,"ig");
            var arryKCS=xmlNodeTM.text.match(re);
	        bandPD.setFldStrValue(i,xmld.baseName,(!arryKCS)?0:arryKCS.length);
        }
        bandPD.CalXmlLand.Calculate(i);
    }
    
}
//-------- ���,�ͷ�������� ���� ---------------------//
    //�ڵ����ڼ���������Ķ�Ӧ��������һ
    //����Ҫ�е��ֶΣ���Ʒ����/���/�����ɫ����/��ɫ/����(S/M/L/XL/XXL/XXLֵ���ֶ�����ֵ)�����������Զ�ʶ�������
    // ������ itemname:���������ƣ�fldsize:�����ֶ�, fldsrc:ԭ������flddest:ʵ��ɨ����������txmlist:�������б�Ԫ�أ� colsfill:����б�ʹ�õ��ֶ�
    //          ���fldsrc/flddest��ͬ�򲻶��������Աȡ�
    var barlen = 16;
    function usAddTXMFld(itemname, fldsize, fldsrc, flddest, txmlist, colsfill) 
    {
        var el = event.srcElement;
        if (event.keyCode != 13 || el.value=="") return;
        el.value = barTrue(el.value);
        el.select();
        if (!el.value || el.value.length !=15)
            return;
        var hashj = false;
        if ($band("master"))
            hashj = $band("master").Val("�л���");
        if (txtHjh && ("1" == hashj || "true" == hashj))
            hashj = true;
        else
            hashj = false;
        var txtHjh = $("txtHjh");
        if (txtHjh && !txtHjh.value && hashj)
        {
            alert("��ѡ��Ҫ������Ʒ�Ļ��ܺ�!");
            return;
        }
        var txmcode = el.value;
        //����Ƿ��ظ�
        var txmlist = $(txmlist);
        var re = new RegExp("\\b" + txmcode + "\\b", "ig");
        for (var i = 0; i < txmlist.options.length; i++)
        {
            if (txmlist.options[i].text.search(re) < 0)
                continue;
            return msgTxm("�����ظ�", true);
        }
        //������
        var strKC = txmcode.substr(0, 11);
        var strSize = txmcode.substr(10, 1);
        var colSize = ["", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"];
        if (!colSize[strSize])
            return msgTxm("û���������ı��", true);
        colSize = colSize[strSize];
        //��鵥����������Ϣ
        var band = $band(itemname);
        var index = -1;
        for (var i = 0, len = band.RecordCount(); i < len; i++)
        {
            var kc = band.getFldStrValue("����", i);
            if (strKC != kc) continue;  //���벻ͬ,����һ��
            if (colSize != band.getFldStrValue(fldsize, i)) //���벻ͬ,����һ��
                continue;
            //�����л����ֶε����
            if (hashj && band.Val("���ܺ�",i) != txtHjh.value)
                continue;
            index = i;
            break;
        }
        if (index < 0)
            return msgTxm("����û�������ɫ�Ŀ��", true);
        //���������ı��б�ͳ��ͬ�����ɫ��������
        var strKCS = txmcode.substr(0, 11);
        var countT = 1;
        var re = new RegExp("\\b" + strKCS + "\\w{4}\\b", "ig");
        for (var i = 0; i < txmlist.options.length; i++) {
            var matchs = txmlist.options[i].text.match(re);
            countT += !matchs ? 0 : matchs.length;
        }
        //�ڵ����ڸ��¿����ɫ��������,������ͬ�����ɫ�ظ����������ֻ�Զ�����һ����¼
        if (fldsrc != flddest)
        {
            var isrc = ToolUtil.Convert(band.getFldStrValue(fldsrc, index), "int");
            var idest = ToolUtil.Convert(band.getFldStrValue(flddest, index), "int");
            if (isrc <= idest)
                return msgTxm("��������", true);
        }
        band.setFldStrValue(index, flddest, countT);
        if (band.Grid) band.Grid.Sum();
        if($("message")) $("message").innerHTML = "OK!";
        //�����б��ı�������������Ϣ
        var len = txmlist.options.length = txmlist.options.length + 1;
        var cols = colsfill.split(",");
        for (var i = 0; i < cols.length; i++)
        {
            if ("����" == cols[i] || "��������" == cols[i])
                txmcode += "    " + colSize;
            else
                txmcode += "    " + band.getFldStrValue(cols[i], index);
        }
        if (txtHjh && txtHjh.value)
            txmcode += "    " + txtHjh.value;
        txmlist.options[len - 1].text = txmcode;
        txmlist.options[len - 1].value=el.value;
        
    }
    function msgTxm(msg, isalert)
    {
        if (!isalert) return;
        if ($("message")) $("message").innerHTML = '<IMG src="images/warning.png" border="0" style="vertical-align:middle"/>&nbsp;' + msg + "!";
        var mediaplay = $("MyMedia");
        mediaplay.FileName = "../Error.wav";
        mediaplay.Play();
    }
    
    //�ڵ����ڼ���������Ķ�Ӧ��������һ
    //����Ҫ�е��ֶΣ���Ʒ����/���/�����ɫ����/��ɫ/S/M/L/XL/XXL/XXL�����������Զ�ʶ�������
    // ������ detail:���������ƣ�hjdetail:������ϸ���ƣ�srcsuff:�����ֶ�Դ�ֶκ�׺(��X1֮"1")�� destsuff:�����ֶ�Ŀ���ֶκ�׺(��X2֮"2")��txmlist:�������б�Ԫ�أ� colsfill:����б�ʹ�õ��ֶ�
    //        ���srcsuff/destsuff��ͬ�򲻶��������Աȡ�
    //        colsfill��ֵ��û�ж�Ӧ�����ɫʱ�澯�޶���Ϊ�������hjdetail�Զ�����
        function usTxmDetail(detail, hjdetail, srcsuff, destsuff, txmlist, colsfill,needfld)
        {
        
            if (event.keyCode != 13) return;
            if(needfld)
                if($band("master").Val(needfld)==""){alert("��ָ��" + needfld + "!");return}
            var el = event.srcElement;
            el.value = barTrue(el.value);
            if (colsfill) el.select();
            var txtHjh = $("txtHjh");
            if(txtHjh){
                if (!txtHjh.value && ($band("master").Val("�л���") == "1" || $band("master").Val("�л���") == "-1" || $band("master").Val("�л���") == "true"))
                {
                    alert("����ѡ���˰����ܴ�Ż�Ʒ����ѡ��Ҫ������Ʒ�Ļ��ܺ�!");
                    return;
                }
                if ($band("master").Val("�л���") == "0" || $band("master").Val("�л���") == "false")
                    txtHjh.value = $band("master").Val(needfld);
            }
            var txmcode = el.value;
            if (!el.value || el.value.length != 15)
                return msgTxm("���벻��ȷ!", colsfill);
            //����Ƿ��ظ�
            var txmlist = $(txmlist);
            var re = new RegExp("\\b" + txmcode + "\\b", "ig");
            for (var i = 0; colsfill && i < txmlist.options.length; i++)
            {
                if (txmlist.options[i].text.search(re) < 0)
                    continue;
                return msgTxm("�����ظ�", colsfill);
            }
            if(!isContain(txmcode,"bardata","����"))
                return msgTxm("���벻��Ӧ", colsfill);
            //������
            var strKC = txmcode.substr(0, 10);
            var strSize = txmcode.substr(10, 1);
            var colSize = "";
            switch (strSize)
            {
                case "1": colSize = "XS"; break;
                case "2": colSize = "S"; break;
                case "3": colSize = "M"; break;
                case "4": colSize = "L"; break;
                case "5": colSize = "XL"; break;
                case "6": colSize = "XXL"; break;
                case "7": colSize = "XXXL"; break;
                case "8": colSize = "XXXXL"; break;
            }
            if (!colSize)
                return msgTxm("û���������ı��", colsfill);
            //��鵥����������Ϣ
            var band = $band(detail);
            var index = -1;
            for (var i = 0, len = band.RecordCount(); i < len; i++)
            {
                var kc = band.getFldStrValue("�����ɫ����", i);
                if (strKC != kc) continue;
                index = i;
                break;
            }
            if (index < 0)
                return msgTxm("����û�������ɫ�Ŀ��", colsfill);
            //���������ı��б�ͳ��ͬ�����ɫ��������
            var strKCS = txmcode.substr(0, 11);
            var countT = colsfill ? 1 : 0;
            var re = new RegExp("\\b" + strKCS + "\\w{4}\\b", "ig");
            for (var i = 0; i < txmlist.options.length; i++)
            {
                var matchs = txmlist.options[i].text.match(re);
                countT += !matchs ? 0 : 1;
            }
            band.setFldStrValue(index, colSize + (destsuff ? destsuff : ""), countT);
            band.CalXmlLand.Calculate(index);
            if (band.Grid) band.Grid.Sum();
            if (!colsfill) return;
            if($("message")) $("message").innerHTML = "OK!";

            //�����б��ı�������������Ϣ
            var cols = colsfill.split(",");
            for (var i = 0; i < cols.length; i++)
            {
                if ("����" == cols[i] || "��������" == cols[i])
                    txmcode += "    " + colSize;
                else
                    txmcode += "    " + band.getFldStrValue(cols[i], index);
            }
            if (txtHjh && txtHjh.value)
                txmcode += "    " + txtHjh.value;
            var len = txmlist.options.length = txmlist.options.length + 1;
            txmlist.options[len - 1].text = txmcode;
            try{
            if(!window.strbars && window.strbars!="") return; 
            strbars = strbars + ","+txmcode;
            }catch(ex){};
        }
        function isContain(txm, band, fld)
        {
            if (!txm || !fld) return true;
            var band = $band(band);
            if (!band) return true;
            var txmText = band.getFldStrValue(fld);
            if (!txmText) return true;
            var re = new RegExp("\\b" + txm + "\\b", "ig");
            if (txmText.search(re)>-1)
                return true;
            return false;
        }        

    function op_search()
    {
        var s = txtbarlocate.value;
        for(var m=0;m<oBarbox.options.length;m++)
        {
            var text = oBarbox.options[m].text;
            var val  = oBarbox.options[m].value;
            if(text.indexOf(s)>-1) {
                oBarbox.options[m].selected=true;
                break;
            }
        }
    }     
    function op_delete(suff)
    {
        var sl = oBarbox.options.selectedIndex;
        sl = sl >= oBarbox.options.length ? oBarbox.options.length - 1 : sl < 0 ? 0 : sl;
        if (sl < 0 || !oBarbox.options[sl]) return;
        var txmKC = oBarbox.options[sl].text.substr(0, 11);
        oBarbox.options.remove(sl);
        //������ϸ��������
        var strSize = txmKC.substr(10, 1);
        txmKC = txmKC.substr(0, 10);
        var size = ["", "XS"+suff, "S"+suff, "M"+suff, "L"+suff, "XL"+suff, "XXL"+suff, "XXXL"+suff, "XXXXL"+suff];
        //��鵥����������Ϣ
        var band = $band("detail");
        var index = -1;
        for (var i = 0, len = band.RecordCount(); i < len; i++)
        {
            var kc = band.getFldStrValue("�����ɫ����", i);
            if (txmKC != kc) continue;
            index = i;
            break;
        }
        if (index < 0) return;
        //���������ı��б�ͳ��ͬ�����ɫ��������
        var strKCS = txmKC + strSize;
        var countT = 0;
        var re = new RegExp("\\b" + strKCS + "\\w{4}\\b", "ig");
        for (var i = 0; i < oBarbox.options.length; i++)
        {
            var matchs = oBarbox.options[i].text.match(re);
            countT += !matchs ? 0 : 1;
        }
        band.setFldStrValue(index, size[strSize], countT);
        band.CalXmlLand.Calculate(index);
        if (band.Grid) band.Grid.Sum();

        if (sl < oBarbox.options.length)
            oBarbox.options[sl].selected = true;
        else if (oBarbox.options.length > 0)
            oBarbox.options[sl - 1].selected = true;
    }        
    //�������뷽ʽ
    function op_sdelete(suff)
    {
        var sl = oBarbox.options.selectedIndex;
        sl = sl >= oBarbox.options.length ? oBarbox.options.length - 1 : sl < 0 ? 0 : sl;
        if (sl < 0 || !oBarbox.options[sl]) return;
        var txmKC = oBarbox.options[sl].text.substr(0, 11);
        oBarbox.options.remove(sl);
        //������ϸ��������
        var strSize = txmKC.substr(10, 1);
        if(!suff) suff="";
        var size = ["", "XS"+suff, "S"+suff, "M"+suff, "L"+suff, "XL"+suff, "XXL"+suff, "XXXL"+suff, "XXXXL"+suff];
        //��鵥����������Ϣ
        var band = $band("detail");
        var index = -1;
        for (var i = 0, len = band.RecordCount(); i < len; i++)
        {
            var kc = band.getFldStrValue("�����ɫ����", i);
            var sT = band.getFldStrValue("����", i);
            if (txmKC != kc || sT != size[strSize])
                continue;
            index = i;
            break;
        }
        if (index < 0) return;
        //���������ı��б�ͳ��ͬ�����ɫ��������
        txmKC = txmKC.substr(0, 10);
        var strKCS = txmKC + strSize;
        var countT = 0;
        var re = new RegExp("\\b" + strKCS + "\\w{4}\\b", "ig");
        for (var i = 0; i < oBarbox.options.length; i++)
        {
            var matchs = oBarbox.options[i].text.match(re);
            countT += !matchs ? 0 : 1;
        }
        if (countT > -1)
        {
            band.setFldStrValue(index, "��������", countT);
            band.CalXmlLand.Calculate(index);
        } 
        if (band.Grid) band.Grid.Sum();

        if (sl < oBarbox.options.length)
            oBarbox.options[sl].selected = true;
        else if (oBarbox.options.length > 0)
            oBarbox.options[sl - 1].selected = true;
    }           

     function barTrue(b)
     {
        if(b.length==16) b = b.substring(1,b.length);return b;
     }