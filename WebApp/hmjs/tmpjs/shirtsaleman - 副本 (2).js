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
    function cboAfterUpdate(o)
    {
        if(o.nodeName=="A")
            fSearch("字典信息",o.innerHTML);
    }
    function openPro(){
        if($band("字典信息").Val("主名称")=="") {alert("请先指定所属单位！");return}
        var title  = DlgTitle+"－【创建日期："+"<span datasrc='#"+mband.ID+"' datafld='创建日期_格式'></span>" +"/ 更新日期：<span datasrc='#"+mband.ID+"' datafld='更新日期_格式'></span>】";
        var str=strfind("winview",null,$band("字典信息"));
        DlgWin("winview","gridview",title,"字典信息",str,700,480);
        YPanel("字典信息","dvCustTab",null,1,"@地址=1,@税率=1,@税率1=1,@QQ号=1","220");
    }

    function strfind(winid,gridname,bandname)
    {
        if(!bandname) bandname="";
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

    function getPieByBand(ItemName,Container,title,chartType,xAxisText,yAxisText)
    {   
        var ob = $band(ItemName);
        var strrows = "";var barrows = "";
        //计算百分比(应用于chart pie);
        var columnnames = "";
        for(var i=0;i<ob.RecordCount();i++)
        {
            var strcols = "";var barcols = "";
            for(var j=0;j<ob.ColNames.length;j++)
            {
                if(ob.ColNames[j]=="RowNum" || ob.ColNames[j]=="序号" || ob.ColNames[j]=="小计") continue;
                if(ob.ColNames[j]=="名称")
                { 
                    strcols = strcols + "," + ob.getFldStrValue(ob.ColNames[j],i);
                    barcols = strcols;
                }
                else
                {
                    strcols = strcols+","+"['"+ob.ColNames[j]+"',"+ob.getFldStrValue(ob.ColNames[j],i)*100/ob.getFldStrValue("小计",i)+"]";
                    barcols = barcols+","+ToolUtil.Convert(ob.getFldStrValue(ob.ColNames[j],i),"int");
                }
                if(i==0)
                    columnnames = columnnames + "," + ob.ColNames[j];
            }
            strrows = strrows + ";" + strcols.substring(1,strcols.length);
            barrows = barrows + ";" + barcols.substring(1,barcols.length);
        }
        strrows = strrows.substring(1,strrows.length);
        barrows = barrows.substring(1,barrows.length);
        columnnames = columnnames.substring(1,columnnames.length);
        
        var oldwidth = $("grdchart").clientWidth;
        if(ob.RecordCount()*160+50>oldwidth)
            $("grdchart").style.width=ob.RecordCount()*160+50;
        
        //定义chart object
        var options = 
        {
			chart: {renderTo: Container},
			title: {text: title},
			xAxis: {categories: []},
            yAxis: {min: 0,title: {text: '数量(个)'}},
			tooltip: {
				formatter: function() {
					var s;
					if (this.point.name) { // the pie chart
						s = ''+
							this.point.name +': '+ this.y +'%';
					} else {
						s = ''+
							this.x  +': '+ this.y;
					}
					return s;
				}
			},
	        plotOptions: 
	        {
		        pie: 
		        {
			        allowPointSelect: true,
			        cursor: 'pointer',
			        dataLabels: 
			        {
				        enabled: true,
				        formatter: function() 
				        {
					        if (this.y > 0) return this.point.name + this.y +' %';
				        },
				        color: 'white',
				        style: 
				        {
					        font: '8pt 微软雅黑, sans-serif'
				        }
			        }
		        }
	        },					
			labels: {
				items: []
			},
			series: []
        };
        var lines = strrows.split(";");
        var barlines = barrows.split(";");
        for(var i=0;i<lines.length;i++)
        {
            var line = lines[i];
            var bline = barlines[i];
            var items = line.substring(line.indexOf(",")+1,line.length);
            var bitems = bline.substring(bline.indexOf(",")+1,bline.length);
            var piename = line.substring(0,line.indexOf(","));
            //categories = categories + "," + piename;
            options.xAxis.categories.push(piename)
            var labelitems = {
				html: piename,
				style: {
					left: (i*160+75/2) + 'px',
					top: '-10px',
					color: 'black'				
				    }
				};
			var columnseries = {
						type: 'column',
						name: piename,
						data: []
					};
            var pieseries = {
                type: chartType,
                allowPointSelect: true,
                name:piename,
                data: [],
                center: [i*160+50, 80],
                size: 150,
                showInLegend: false     
            };
            if(i==lines.length-1) pieseries.showInLegend=true;
            var strjson = "[" + items + "]";
            var strbjson = "[" + bitems + "]";
            pieseries.data=eval(strjson);
            columnseries.data=eval(strbjson);
            options.series.push(pieseries);
            options.series.push(columnseries);
            options.labels.items.push(labelitems);
        }
        var chart = new Highcharts.Chart(options);
        

    }   
    function showchart()
    {
        var title="客户类型分布统计";
        var vname="数量";
        var ItemName = "统计";
        var chartType="pie";
        var str = strchart("winchart","grdchart",ItemName,title);
        DlgWin("winchart","grdchart",title,ItemName,str,770,480);
        $band("统计").XQuery();
        getChartByBand(ItemName,"grdchart",title,chartType);
    }
    function getChartByBand(ItemName,Container,title,chartType,xAxisText,yAxisText)
    {
        if(chartType=="pie")
        {
            getPieByBand(ItemName,Container,title,chartType,xAxisText,yAxisText);
            return;
        }   
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
        //每一组为一列(用;分割),第一组为标题列,第二组后为数据
        var ob=$band(ItemName);
        var data ="";        var ocols = ob.Cols("0");
        for(var i=0;i<ob.ColNames.length;i++)
        {   
            if(ob.ColNames[i]=="RowNum" || ob.ColNames[i]=="序号") continue; 
            var s = ob.ColNames[i];
            var colitem = ob.ColObj(ocols[i]);     
            for(var j=0;j<ob.RecordCount();j++)
            {
                var v = ob.getFldStrValue(ob.ColNames[i],j);
                if(colitem.datatype=="int") v = ToolUtil.Convert(v,"int");
                s =  s + "," + v; 
            }
            data = data + ";"+ s;
        }
        
        var data =  data.substring(1,data.lenght);
        var lines = data.split(";");
        var categories = "";
        for(var i=0;i<lines.length;i++)
        {
            var line = lines[i];
            var items = line.split(',');
            if(i==0 && chartType!="pie"){
                for(m=1;m<items.length;m++)
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
    
    function strchart(winid,gridname,bandname,title)
    {
        var s= '<fieldset style="padding: 5px;;width:100%;text-align:right"><legend>摘要信息：</legend>\
        <label class="span40fn" for="chkbar">直方图：</label><input id="chkbar" type="radio" value="bar" \
        onclick="getChartByBand(\''+bandname+'\',\''+gridname+'\',\''+title+'\',this.value)" checked name="RChartType" class="xlandradio" />\
        <label class="span40fn" for="chkpie">饼图：</label><input id="chkpie" type="radio" value="pie" onclick="getChartByBand(\''+bandname+'\',\''+gridname+'\',\''+title+'\',this.value)"  name="RChartType" class="xlandradio" />\
        <label class="span40fn" for="chkline">折线图：</label><input id="chkline" type="radio" value="line" onclick="getChartByBand(\''+bandname+'\',\''+gridname+'\',\''+title+'\',this.value)"  name="RChartType" class="xlandradio" />\
        </fieldset><fieldset style="text-align:left;padding: 5px;height:380px;width:100%"><legend>统计数据：</legend>\
        <div class="tablescroll" style="height:380;width:750px;OVERFLOW:auto;">\
        <div id="'+gridname+'" class="tablescroll" style="text-align:left;width:100%; height:100%;margin: 0 auto"></div></div></fieldset>';
        return s;
    }