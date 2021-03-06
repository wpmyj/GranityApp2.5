var gshowModalDialogReturn=0;
String.prototype.Trim = function(){return this.replace(/(^\s*)|(\s*$)/g, "");}
String.prototype.LTrim = function(){return this.replace(/(^\s*)/g, "");}
String.prototype.RTrim = function(){return this.replace(/(\s*$)/g, "");}
String.prototype.lTrim = function() {return this.replace(/(^[\s]*)/g, ""); } 
String.prototype.rTrim = function() {return this.replace(/([\s]*$)/g, ""); } 
String.prototype.replaceAll = function(regText,replaceText){var raRegExp = new RegExp(regText,"g"); return this.replace(raRegExp,replaceText); }; 
function str2num(str){var s=str.substring(0,1);var x=str.replace(/[^0-9.]/ig,"");
		if(x=="") x=0;if(s=="-" && x!=0) x=s+x;return x;}
function $( id ){return document.getElementById( id );}
//格式化字符串;字符串类型数据格式化数字或日期类型数据
String.prototype.formate=function(format)
{
    var strvalue=this;if(!format || "　"==strvalue) return this;
    else if(format.indexOf("#")>-1) strvalue=ToolUtil.Convert(this, "number");
    else if(format.indexOf("y")>-1 || format.indexOf("M")>-1 || format.indexOf("m")>-1 || format.indexOf("H")>-1 
                || format.indexOf("d")>-1 || format.indexOf("Y")>-1 || format.indexOf("D")>-1 || format.indexOf("h")>-1 )
        strvalue=ToolUtil.Convert(this, "date");
    else return this;
    if(strvalue!=null) return strvalue.formate(format);  else return null
}

//格式化数字:0控制位数 ,控制分位 #控制数字自然个数
//formate格式化字符串:45733.42375.formate("$,####.000") 结果: $4,5733.424
Number.prototype.formate=function(format)
{
	var f = 0, n = 0; // f:小数位 n:整数
	var c = "",s = 0,z = 0; // c:货币符号 s:分位数 z:四舍五入位数
	var num =this+"";
	if(num.indexOf(".")>-1){
		f = num.split(".")[1];
		n = num.split(".")[0] - 0;
	}else{
		n = num - 0;
	}
	var arrFormat = format.split(/[\,\.]/g);
	for(var i=0;i<arrFormat.length;i++){
		if(arrFormat[i].indexOf("0")>-1){
			z = arrFormat[i].length;
		}else if(arrFormat[i].indexOf("#")>-1){
			s = arrFormat[i].length;
		}else{
			c = arrFormat[i];
		}
	}

	var ss = "1";
	for(var i=0;i<z;i++){
		ss += "0";
	}
	var ss = ss - 0;
	f = Math.round(("0." + f)*ss)/ss+"";
	if(f.indexOf(".")>-1){
		f = f.split(".")[1];
	}
	
	if(f.length<z){
		for(var i=f.length;i<z;i++){
			f += "0";
		}
	}
	n += "";
	var iStart = n.indexOf(".");
	if (iStart < 0)
		iStart = n.length;

	iStart -= s;
	while (iStart >= 1) {
		n = n.substring(0,iStart) + "," + n.substring(iStart,n.length)
		iStart -= s;
	}
	if(this>-0.00000001 && this<0.00000001)
	     return "";
	var vs=c+n;
	if(z>0)
		vs = c+n+"."+f;
    if(vs.substring(0,1)==".") vs="0"+vs;
    if(vs.substring(0,1)==",") vs=vs.substring(1,vs.length);
    if(vs.substring(0,2)=="-,") vs="-"+vs.substring(2,vs.length);
    if(vs.substring(0,2)=="-.") vs="-0."+vs.substring(2,vs.length);
	return vs;
}
//日期格式化:YYYY-MM-dd 时间格式或:HH:mm:ss
Date.prototype.formate=function(formate)
{
	var d=this;
	if(!formate || ""==formate)
		formate="yyyy-MM-dd";
    var m=formate.match(/[Yy]{4}|[Yy]{2}|[M]{1,4}|[Dd]{1,4}|[Hh]{1,2}|[m]{1,2}|[Ss]{1,2}/g);
    var arryMonFull=new Array("January","February","March","April","May","June","July","Auguest","September","October","November","December");
    var arryMonShort=new Array("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec");
    var arryDayFull=new Array("Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday");
	var arryDayShort=new Array("Sun","Mon","Tue","Wed","Thu","Fri","Sat");
	var strm=new Array();
	for(var i=0;i<m.length;i++)
	{
		strm[i]=formate.substr(0,formate.indexOf(m[i])+m[i].length);
		formate=formate.substr(formate.indexOf(m[i])+m[i].length);
		strm[i+1]=formate;
	}
	formate=""; 
	for(var i=0;i<m.length;i++)
	{ 
		switch(m[i].toUpperCase())
		{
			case "YYYY": 
			case "YYY":  
				formate += strm[i].replace(m[i],d.getFullYear());
				break;
			case "YY":
				var y=d.getFullYear()+"";
				formate += strm[i].replace(m[i],y.substr(y.length-2));
				break;
			case "MMMM":
				var mon=arryMonFull[d.getMonth()];
				formate += strm[i].replace(m[i],mon);
				break;
			case "MMM":
				var mon=arryMonShort[d.getMonth()];
				formate += strm[i].replace(m[i],mon);
				break;
			case "MM":
				if("mm"==m[i])
					var month="00"+""+d.getMinutes();
				else
					var month="00"+""+(d.getMonth()+1);
				formate += strm[i].replace(m[i],month.substr(month.length-2));
				break;
			case "M":
				if("m"==m[i])
					var month=d.getMinutes();
				else
					var month=d.getMonth()+1;
				formate += strm[i].replace(m[i],month);
				break;
			case "DDDD":
				var day=arryDayFull[d.getDay()];
				formate += strm[i].replace(m[i],day);
				break;
			case "DDD":
				var day=arryDayShort[d.getDay()];
				formate += strm[i].replace(m[i],day);
				break;
			case "DD":
				var dd="00"+""+d.getDate();
				formate += strm[i].replace(m[i],dd.substr(dd.length-2));
				break;
			case "D":
				var dd=d.getDate();
				formate += strm[i].replace(m[i],dd);
				break;
			case "HH":
				var dd="00"+""+d.getHours();
				formate += strm[i].replace(m[i],dd.substr(dd.length-2));
				break;
			case "H":
				var dd=d.getHours();
				formate += strm[i].replace(m[i],dd);
				break;
			case "SS":
				var dd="00"+""+d.getSeconds();
				formate += strm[i].replace(m[i],dd.substr(dd.length-2));
				break;
			case "S":
				var dd=d.getSeconds();
				formate += strm[i].replace(m[i],dd);
				break;
		}
	}//for(var i=0;i<m.length;i++)
	formate += strm[m.length];
	return formate;
}
//返回日期加上天数的新日期
Date.prototype.addDate=function(interval)
{
    var day=parseInt(interval);
    var second=parseFloat(interval)-parseInt(interval);
    second=second*24*60*60;
    var d=new Date(this);
    d.setDate(d.getDate()+day);
    d.setSeconds(d.getSeconds()+second);
    return d;
}
//返回日期减去指定日期的天数
Date.prototype.diffDate=function(d)
{
    return (this-d)/1000/60/60/24;
}

function ue_instrs(strs,str)
{
    for(var i=0;i<strs.length;i++)
    {
        if(strs[i]==str) return true;
    }
    return false;
}
//工具套,封装一些通用小功能函数
var ControlUtil=new function()
{
}


//获取顶级窗口引用资源
ControlUtil.usGetTopFrame=function()
{
	var win=window;
	while(win.parent)
	{
		if(win===win.parent) break;
		win=win.parent;
	}
	return win;
}
ControlUtil.TopFrame=ControlUtil.usGetTopFrame();
if("object"!=typeof(ToolUtil))
    ToolUtil=ControlUtil.TopFrame.ToolUtil;

////根据事件源,或者数据岛ID,或者数据项目名称 找到Band对象
//GridUtil.FindBand=function(xmlID)
//{
//    var myUnit=document.UnitItem;
//	if(!xmlID)
//	{
//		var tab=ToolUtil.getCtrlByTagU(false,event.srcElement,"TABLE","tabType","grid");
//		if(!tab)	return;
//		var tabDetail=ToolUtil.getCtrlByTagD(true,tab,"TABLE","tabType","detail");
//		if(!tabDetail || !tabDetail.Grid)
//			return null;
//		return myUnit.getBandByItemName(tabDetail.Grid.ItemName);
//	}else{
//		var xmlland=document.getElementById(xmlID);
//		if(xmlland)
//			return myUnit.getBandByItemName(xmlland.itemname);
//		else
//		    return myUnit.getBandByItemName(xmlID);
//	}
//	return null;
//}

WinLoadUtil=new function(){}

WinLoadUtil.MDTPLoad=function()
{
    if("object"!=typeof(ToolUtil))
        GridUtil.Loadjs(GridUtil.ToolUtilJs);
    var myUnitItem=new UnitItem();
    if("Main"!=myUnitItem.TempType)
        this.document.title = myUnitItem.UnitName;
    if(document.GridList && document.GridList.length>0)
        if("function"==typeof(GridUtil) && "function"!=typeof(GridUtil.usOnCellFocusHandle))
            GridUtil.Loadjs(GridUtil.GridUtilBas);
    for(var i=0;document.GridList && i<document.GridList.length;i++)
    {
	    if(document.GridList[i].GridDiv)
		    document.GridList[i].GridDiv.Grid.dataBindRefresh();
    }
    for(var i=0;document.TreeList && i<document.TreeList.length;i++)
    {
        if(document.TreeList[i].WebTree)
            if(document.TreeList[i].WebTree.Tree)
                document.TreeList[i].WebTree.Tree.dataBindRefresh();}
    
    myUnitItem.getState();
    
	setTimeout(setSpecialCell,1000);

    if(typeof(initWin)=="function")	setTimeout(initWin,10);
    
    var ChartItem=new Array();
    var ChartObj=new Array();
    var inum=0;
	for(var i=0;document.ChartList && i<document.ChartList.length;i++)
	{
	    if(document.ChartList[i].Element)
	    {
	        var chartType=document.ChartList[i].Element.getAttribute("charttype");
	        document.ChartList[i].Element.Chart.initDataLand();
	        if(chartType=='verlinePlus') 
	        {
	            ChartItem[inum]=usChartLinePlus(document.ChartList[i].Element);
	            ChartObj[inum]=document.ChartList[i].Element;
	            inum++;
	            continue;
	        }
	        document.ChartList[i].Element.Chart.initData();
	        document.ChartList[i].Element.Chart.InitAxis();
	        document.ChartList[i].Element.Chart.Draw();
	        document.ChartList[i].Element.Chart.DrawLegend();
	    }
	}
	for(var i=0;i<ChartItem.length;i++)
	    ChartObj[i].innerHTML=ChartItem[i].part1;
	    ToolUtil.sleep(1);
	for(var i=0;i<ChartItem.length;i++)
	{
	    document.getElementById(ChartItem[i].name).innerHTML=ChartItem[i].part2;	
	     ToolUtil.sleep(1);
    }
}

function setSpecialCell()
{
    if(!document.UnitItem || !document.UnitItem.Bands) return;
	for(var ib=0; ib<document.UnitItem.Bands.length;ib++)
	{
	    var oband = document.UnitItem.Bands[ib];
	    //document.UnitItem.getBandByItemName("goods");
	    if(!oband || !oband.CalXmlLand || !oband.CalXmlLand.XmlSchema || !oband.CalXmlLand.RedWordCellList || !oband.Grid
	        || oband.CalXmlLand.RedWordCellList.length==0) continue;
	    var oGrid = oband.Grid;
	    for(var i=0;i<oGrid.Table.rows.length;i++)
	    {
		    var tr=oGrid.Table.rows[i];
		    if(!tr.recordNumber || tr.recordNumber<1)
			    break;		
		    for(var j=0;j<tr.cells.length;j++)
		    {
		        var cell=tr.cells[j];
	            var ctrlCol=ToolUtil.getCtrlByNameD(false,cell,"colname");
	            var datastyle=cell.getAttribute("datatype");
	            if(!ctrlCol && (!datastyle || ""==datastyle))
		            continue;
                for(var _i=0;_i<oband.CalXmlLand.RedWordCellList.length;_i++)
                {
                    if(!ctrlCol || !ctrlCol.dataFld) continue;
                    if(ctrlCol.dataFld!=oband.CalXmlLand.RedWordCellList[_i].ColName) continue;
	                if(ctrlCol.value<0) 
	        	        oGrid.setCtrlStateColor(cell,"warned",0);
		        }
		    }
	    }		
	}
}
function setgridtitle()
{var obj=document.getElementById("tdtitle");
if(obj){obj.innerText=document.UnitItem.UnitName.replace("字典_","").replace("dict_","")}}
function getband(item)
{if(document.UnitItem) return document.UnitItem.getBandByItemName(item);}
function ms_close(icase)
{
    if(!icase){
    var result = confirm("您关闭当前窗口吗？");
    if(!result) return false}
    try{parent.parent.openBusinessNav();return true}catch(e){window.onbeforeunload=null;window.close();return true}
}
function getpband()
{ if(window.opener && window.opener.document)
    {
        var pUnitItem = window.opener.document.getElementById("mainform").contentWindow.document.getElementById("content").contentWindow.document.UnitItem;
        if(!pUnitItem) return;
        return pUnitItem.getBandByItemName("nav"); 
    }
    else if(window.dialogArguments) return window.dialogArguments;else return
}
function createXml(str){if(document.all){var xmlDom=new ActiveXObject("Msxml2.DOMDocument");xmlDom.loadXML(str);return xmlDom} 
　　else return new DOMParser().parseFromString(str, "text/xml")}
function dynYearOpt(obj)
{
    if(obj.options.length>2) return;
	var myDate = new Date();
	var thisyear = myDate.getFullYear();
	obj.options.length=0;
	for(var i=-10;i<10;i++)
	{
		var opt=new Option(thisyear+i,thisyear+i);
		obj.options.add(opt);
	}
	obj.value=thisyear;
	return thisyear;
}
function dynMonthOpt(obj)
{
	obj.options.length=0;
	for(var i=0;i<12;i++)
	{
		var opt=new Option(1+i,1+i);
		obj.options.add(opt);
	}
}

function ue_saveXml()
{
    var  xmlLands = document.getElementsByTagName("XML");
    var str="";
    var strUnitItem = "";
    var dataitems = new Array();
    var ctrlmethods = new Array(0);
    
    for(var i=0;i<xmlLands.length;i++)
    {
        if(xmlLands[i].id=="_xslsum" || xmlLands[i].id=="_xslsort") continue;
		if(xmlLands[i].id.indexOf("_Sumtemp")>-1)
            continue;
        var xmldm = xmlLands[i];
        switch(xmlLands[i].typexml)
        {
            case "ConfProperty":
		        if(!xmlLands[i].XMLDocument && xmlLands[i].XMLDocument.documentElement) break;
	            strUnitItem = xmlLands[i].name;
	            var xmlNodeItems = xmldm.XMLDocument.selectNodes("//Item");
	            var xmlNodeColumns = xmldm.XMLDocument.selectNodes("//Column");
	            var strcols = "";var strhtml = xmldm.outerHTML;
	            var objcols = xmldm.getElementsByTagName("Column");
	            for(var n=objcols.length-1;n>-1;n--)
	            {
	                objcols[n].parentNode.removeChild(objcols[n]);
	            }
//	            for(var m=0;m<xmlNodeItems.length;m++)
//	            {
//	                dataitems[m]=xmlNodeItems[m].getAttribute("dataitem");
//                    for(var n=xmldm.XMLDocument.selectNodes("//Item")[m].selectNodes("Column").length;n>-1;n--)
//                    {
//	                    var xmlRow = xmldm.XMLDocument.selectNodes("//Item")[m].selectNodes("Column")[n];
//	                    if(xmlRow) xmldm.XMLDocument.selectNodes("//Item")[m].removeChild(xmlRow);
//                    }
//	            }
                xmldm.innerHTML = xmldm.xml;
	            str = str + xmldm.outerHTML;
	            break;
	        case "Data":
	        case "Dict":
	            xmldm.innerHTML="";
	            str = str + xmldm.outerHTML;
	            break;
	        case "Schema":
		        //var ss = treatSchema(xmldm);
		        str = str + xmldm.outerHTML;//ss;
		        ctrlmethods.push(xmldm.getAttribute("ctrlchanged"));
		        break;
		    case "Param":
                str = str + treatXmlparamId(xmldm);
	            break;
	        default:
	        str = str + xmldm.outerHTML;
        }
    }
    for(var i=0;i<ctrlmethods.length;i++)
        str = str + document.getElementById(ctrlmethods[i]).parentElement.outerHTML;
    
    var str = str + '<div style="display:none" ><input name="hlb_cmd" type="hidden" id="hlb_cmd" />'
          +'<input type="submit" name="bt_PostBack" value="PostBack" id="bt_PostBack" style="height:1px;" />'
          +'<input name="hlbRequestParams" type="hidden" id="hlbRequestParams" /></div>';
    var str = str.replaceAll('<?IMPORT NAMESPACE = PUBLIC URN = "URN:COMPONENT" DECLARENAMESPACE />','');
    var strsql = "execute updateSysParams '"+ strUnitItem + "','"+ str +"'"
    if(ue_ajaxdom(strsql,"xml")!="ok"){
        alert("模板保存失败！\r\n"+str);
    }

}
function treatXmlparamId(xmlObj)
{
    var elePLs=xmlObj.selectSingleNode("//PL[@t='S']");
    if(!elePLs) return "";
  	var elePLsParent=elePLs.parentNode;
	elePLsParent.removeChild(elePLs);
    elePLs=xmlObj.selectSingleNode("//PL[@t='B']");
  	elePLsParent=elePLs.parentNode;
	elePLsParent.removeChild(elePLs);
	xmlObj.innerHTML = elePLsParent.xml;
    return xmlObj.outerHTML;
}
