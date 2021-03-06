    window.onload=WinLoadUtil.MDTPLoad;
    var mband;
    var sSearchKey = "客户查询...";
    function initWin()
    {
        InitView();
        mband=$band("字典信息");
        mband.minwidth = "80px";
        mband.freecols = "机构名称";
        mband.gridtype = 8;
        mband.readonly = true;
        var Grid = new XGrid("dvMasterTab",mband,"in",null,1);
        mband.XQuery();
        $band("统计").AfterRowChanged=function()
        {
            if(!this.chart || this.RecordCount()==0 || !this.charttype || this.charttype!="pie") return;
            getChartByBand(this.chart,this);
        }
        $loading("none");
    }
    function InitView()
    {
        ueToolbar("tbdiv",elems1,elemsevent1);
        ueLabel("lbldiv1",elems2,elemsevent2,null,1);
        ueLabel("lbldiv2",elems3,elemsevent3,1);   
        ueLabel("Div3",elems4,elemsevent4);
        ueLabel("Div4",elems5,elemsevent5,1);   
        
        $("fSearchText").name = SearchFields;
    }
    function _slunit()
    {
        Mcbo();        
    }
    function cboAfterUpdate(o)
    {
        if(o.nodeName=="A")
            fSearch("字典信息",o.innerHTML);
    }
    function openPro(){
        if($band("字典信息").Val("主名称")=="") {alert("请先指定所属单位！");return}
        DlgView("gridview");
    }
    function DlgView(winid)
    {
        GridUtil.usOnCellRFocusHandle();
//        var p = mband.Val("省");
//        var c = mband.Val("市");
//        var q = mband.Val("区县");
        if(!winid) winid="1";
        var owin = dwobj(winid);
        var str=strfind(winid,null,mband);
        if(!owin)
        {
            var owin = new Object;owin.id = winid;owin.width  = 700;
            owin.height = 480;owin.top = 130; owin.left   = 200;
            owin.title  = DlgTitle+"－【创建日期："+"<span datasrc='#"+mband.ID+"' datafld='创建日期_格式'></span>" +"/ 更新日期：<span datasrc='#"+mband.ID+"' datafld='更新日期_格式'></span>】";
            owin.text   = str;
            owin.hovercolor = "orange";
            owin.color = "black";
            var a = new xWin(owin);
            //指定分割线 @fieldname=1      
            YPanel("字典信息","dvCustTab",null,1,"@地址=1,@税率=1,@税率1=1,@QQ号=1","220");
            center(winid);
        }
        else
            ShowHide(winid,"");
//        $("省").value=p;
//        $("省").fireEvent("onchange");
//        $("市").value=c;
//        $("区县").value=q;            
    }

    function strfind(winid,gridname,bandname)
    {
        if(!bandname) bandname="";
//        var trText = "<span class='span60'>地区：</span><select id='省' name=\"省\" style=\"width:80px\"></select><select id='市' name=\"市\" style=\"width:110px\"></select><select id='区县' name=\"区县\" style=\"width:93px\"></select><font color=#ff0000 face=Wingdings>v</font>";
//        trText = trText + '<script type="text/javascript" language="javascript" defer="defer">new PCAS("省","市","区县")<\/script>';        
        var trText = "<span class='span60'>省份：</span><input datasrc='#"+ mband.ID +"' datafld=\"省\" class=\"xlandinput\" style=\"WIDTH: 150;\" /><input title=\"要选择吗，点我一下...\" class=\"txtbtn\" type=button value=\"...\"  style=\"margin-left:-24px;margin-top:2px;width:22px;height:16; position:absolute\" onclick=\"Xcbo();\"/>\
        <span style=\"width:70px;text-align:right\">市：</span><input datasrc='#"+ mband.ID +"' datafld=\"市\" class=\"xlandinput\" style=\"WIDTH: 100;\" /><input title=\"要选择吗，点我一下...\" class=\"txtbtn\" type=button value=\"...\"  style=\"margin-left:-24px;margin-top:2px;width:22px;height:16; position:absolute\" onclick=\"Xcbo();\"/>";
        var s= '<fieldset style="padding: 5px;;width:98%;text-align:left"><legend>主要信息：</legend>\
        <span class="span60">名称：</span><input datasrc="#'+ mband.ID +'" datafld="机构名称" class=\"xlandinput\" style=\"WIDTH: 150;\" /><input title=\"要选择吗，点我一下...\" class=\"txtbtn\" type=button value=\"...\"  style=\"margin-left:-24px;margin-top:2px;width:22px;height:16; position:absolute\" onclick=\"Xcbo();\"/><font face="Wingdings" color="#ff0000">v</font>\
        <span class="span60">代码：</span><input datasrc="#'+ mband.ID +'" datafld="机构代码" class=\"xlandinput\" style=\"WIDTH: 100;\" /><font face="Wingdings" color="#ff0000">v</font>\
        <span class="span80">热点客户：</span><input datasrc="#'+ mband.ID +'" datafld="热点" class="xlandradio" type="checkbox" />\
        　　　【<a href="#" class="linkbtn_0" onclick="ue_save()">保存</a>】&nbsp;&nbsp;【<a href="#" class="linkbtn_0" onclick="ShowHide(\''+winid+'\',\'none\')">关闭</a>】<p style="margin:2"></p>'
        +trText+'&nbsp;<span style="width:110px;text-align:right">停用标志：</span><input datasrc="'+ mband.ID +'" datafld="停用标志" class="xlandradio" type="checkbox" />\
        </fieldset><fieldset style="padding: 5px;height:86%;width:98%"><legend>详细资料：</legend><div id="dvCustTab" style="text-align:left; height:350;width:100%;OVERFLOW-y:auto;"></div></fieldset>'
        return s;
    }
    function secBoard(n) 
    {
        if(n>=mainTable.tBodies.length) return;
        ueToolCurrent(n,"tbdiv");
        for(i=0;i<mainTable.tBodies.length;i++)
          mainTable.tBodies[i].style.display="none";
        mainTable.tBodies[n].style.display="block";
        TabChange(n);
    }	          
    
    
    function getForm(ochart)
    {   
        var sql="exec chart_客户类型分布统计 '"+$SP("UnitCode")+"'";
        var xmldoc = ue_ajaxdom(sql);
        var nodes = xmldoc.selectNodes("//table");        
        if(!nodes || nodes.length==0) {alert("没有统计数据!");return};
        var str = "";
        var strpercent = "";
        for(var i=0;i<nodes.length;i++)
        {
            var s = "";var spercent = "";
            //计算百分比(应用于chart pie)
            var percent = 0;
            for(var j=2;j<nodes[i].childNodes.length;j++)
                percent = percent + parseInt(nodes[i].childNodes[j].text,10);
            for(var j=2;j<nodes[i].childNodes.length;j++)
            {
              spercent = spercent+","+"['"+nodes[i].childNodes[j].tagName+"',"+nodes[i].childNodes[j].text*100/percent+"]";
              s = s+","+"['"+nodes[i].childNodes[j].tagName+"',"+nodes[i].childNodes[j].text+"]";
            }
            strpercent = strpercent +";" +spercent.substring(1,spercent.length);
            str = str +";" +s.substring(1,s.length);
        }
        str = str.substring(1,str.length);strpercent = strpercent.substring(1,strpercent.length);
        var arr = strpercent.split(";");
        var strjson = "["+arr[3]+"]";
        var data=eval(strjson);
        //为图表设置值   
        ochart.series[0].name = "全国分布";
        ochart.series[0].setData(data,true);
    }   

    function getPieByBand(ochart,ob)
    {   
        var strper = "";var vper = 0;
        //计算百分比(应用于chart pie)
        
        for(var j=2;j<ob.ColNames.length;j++)
        {
            if(ob.ColNames[j]=="RowNum" || ob.ColNames[j]=="序号") continue; 
            vper = vper + ToolUtil.Convert(ob.Val(ob.ColNames[j]),"int");
        }
        for(var j=2;j<ob.ColNames.length;j++)
        {
            if(ob.ColNames[j]=="RowNum" || ob.ColNames[j]=="序号") continue;
          strper = strper+","+"['"+ob.ColNames[j]+"',"+ob.Val(ob.ColNames[j])*100/vper+"]";
        }
        strper = strper.substring(1,strper.length);
        var strjson = "[" + strper + "]";
        var data=eval(strjson);
        //为图表设置值   
        ob.chart = ochart;
        ob.charttype = "pie";
        ochart.series[0].name = "全国分布";
        ochart.series[0].setData(data,true);
    }   

    function showchart()
    {
        var title="客户类型分布统计";
        var vname="数量";
        var ItemName = "统计";
        var chartType="bar";
        var str = strchart("winchart","grdchart",ItemName);
        DlgWin("winchart","grdchart",title,ItemName,str,770,430);
        $band("统计").gridtype = 17;$band("统计").freecols = "区域";
        var Grid = new XGrid("chartgrid",$band("统计"),"in",null,1);        
        $band("统计").XQuery();
        
        if(chartType=="pie")
        {
            var ochart = piechart("grdchart",chartType,title);
            getPieByBand(ochart,$band("统计"));
        }   
        else
            getChartByBand($band("统计"),"grdchart",title,chartType);
    }
    function getChartByBand($band("统计")Container,title,chartType,xAxisText,yAxisText)
    {
        var options = 
        {
            chart: {renderTo: Container,defaultSeriesType: chartType},
            title: {text: title},
            xAxis: { categories: [], title: {text: '区域'}},
            yAxis: { title: {text: '销售量：(元)',align: 'high' }},
            plotOptions: 
            {
                bar: { dataLabels: {enabled: true }},
				pie: {
					allowPointSelect: true,
					cursor: 'pointer',
					dataLabels: {
						enabled: true,
						formatter: function() {
							if (this.y > 0) return this.point.name;
						},
						color: 'white',
						style: {
							font: '13px Trebuchet MS, Verdana, sans-serif'
						}
					}
				}
            },            
		    series: []
        };
        //数据实例
        var data = "Categories,Apples,Pears,Oranges,Bananas;John,8,4,6,5;Jane,3,4,2,3;Joe,86,76,79,77;Janet,3,16,13,15";
        //每一组为一列(用;分割),第一组为标题列,第二组后为数据
        // var data = "北京,广东省,浙江省;代理商,8,4,6,5;直营店,3,4,2,3;网店,86,76,79,77;分公司,3,16,13,15";
        //第一步:取categories
        var categories="";
        for(var i=0;i<ob.ColNames.length;i++)
        {   
            if(ob.ColNames[j]=="RowNum" || ob.ColNames[j]=="序号") continue; 
            var s = "";     
            for(var j=0;j<ob.RecordCount().length;j++)
            {
                s = ColNames[i] + "," + ob.getFldStrValue(ColNames[i],j); 
            }
            data = data + ";"+ s;
        }
        debugger;
         categories =  categories.substring(1,categories.lenght);
        var lines = data.split(";");
        var categories = "";
        for(var i=0;i<lines.length;i++)
        {
            var line = lines[i];
            var items = line.split(',');
            if(i==0 && chartType!="pie"){
                for(m=0;m<items.length;m++)
                    options.xAxis.categories.push(items[m]);
            }
            else
            {
                var series = {type: chartType,data: []};
                for(m=0;m<items.length;m++)
                {
                    if(m==0) series.name = items[0];
                    else
                    {
                        series.data.push(parseFloat(items[m]))
                    }
                }
                options.series.push(series);
            }
        }    
        // Create the chart
        var chart = new Highcharts.Chart(options);
    }
    
  function chartOptionsXX(Container,title,chartType,xAxisText,yAxisText)
    {
        var options = 
        {
            chart: {renderTo: Container,defaultSeriesType: chartType},
            title: {text: title},
            xAxis: { categories: [], title: {text: '区域'}},
            yAxis: { title: {text: '销售量：(元)',align: 'high' }},
            plotOptions: {bar: { dataLabels: {enabled: true }}},            
            series: []
        };
        
        //数据实例

//      var data = "Categories,Apples,Pears,Oranges,Bananas;John,8,4,6,5;Jane,3,4,2,3;Joe,86,76,79,77;Janet,3,16,13,15";
        var data = "北京,广东省,浙江省;代理商,8,4,6,5;直营店,3,4,2,3;网店,86,76,79,77;分公司,3,16,13,15";
        var data = "北京,广东省,浙江省;直营店,3,4,2,3";

//        var sql="exec chart_客户类型分布统计 '"+$SP("UnitCode")+"'";
//        var xmldoc = ue_ajaxdom(sql);
//        var nodes = xmldoc.selectNodes("//table");        
//        if(!nodes || nodes.length==0) {alert("没有统计数据!");return};
//        var categories = "";
//        var 
//        for(var i=0;i<nodes.length;i++)
//        {
//            categories = categories + nodes[i].selectSingleNode("区域").text; 
//        }        

        var lines = data.split(";");
        for(var i=0;i<lines.length;i++)
        {
            var line = lines[i];
            var items = line.split(',');
            if(i==0)
            {
                for(m=0;m<items.length;m++)
                    options.xAxis.categories.push(items[m]);
            }
            else
            {
                var series = {type: chartType,data: []};
                for(m=0;m<items.length;m++)
                {
                    if(m==0) series.name = items[0];
                    else
                    {
                        series.data.push(parseFloat(items[m]))
                    }
                }
                options.series.push(series);
            }
        }    
        // Create the chart
        debugger;
        var chart = new Highcharts.Chart(options);
    }    
    function strchart(winid,gridname,bandname)
    {
        var s= '<fieldset style="padding: 5px;;width:100%;text-align:left"><legend>摘要信息：</legend>\
        <label class="span40fn" for="chkbar">直方图：</label><input id="chkbar" type="radio" value="bar" checked name="RChartType" class="xlandradio" />\
        <label class="span40fn" for="chkpie">饼图：</label><input id="chkpie" type="radio" value="pie"  name="RChartType" class="xlandradio" />\
        <label class="span40fn" for="chkline">折线图：</label><input id="chkline" type="radio" value="lines"  name="RChartType" class="xlandradio" />\
        　　　【<a href="#" class="linkbtn_0" onclick="ShowHide(\''+winid+'\',\'none\')">关闭</a>】<p style="margin:2"></p>\
        </fieldset><fieldset style="text-align:left;padding: 5px;height:86%;width:100%"><legend>统计数据：</legend>\
        <div id="chartgrid" class="tablescroll" style="text-align:left;height:100;width:70%;OVERFLOW:auto;"></div>\
        <div id="'+gridname+'" class="tablescroll" style="text-align:left; height:250;width:746px;OVERFLOW:auto;"></div></fieldset>';
        return s;
    }