/**
 * Created by Mano on 10/05/2017.
 */
(function(){
    var nom = AjaxPlugins.Nomenclador,
		comps = AjaxPlugins.Ext3_components,
		addw = comps.Windows.AddModWindow,
		utils = Genesig.Utils,
        fields = comps.fields,
		plugins = comps.plugins,
        addType =nom.Type.Utils.addType,
	    richText = nom.Type.Types.DB_RichText;

    /**
	 * Tipo descripcion. Es un texto
	 * @class AjaxPlugins.Nomenclador.Type.Types.DB_RichText
     */
    addType('DB_RichText',Ext.extend(nom.Type.ValueType, {
        nameToShow :"Texto enriquecido",
        getValueEditExtComp :function (enumInstance, field){
            var fld = new richTextView({
				allowBlank :!field.needed,
				fieldLabel :field.header,
                plugins:[
                	new grow()
				]
            });
			fld.on('afterrender',function(){
				fld.el.applyStyles({
					'overflow':'auto'
				})
			});

            return fld;
        },
		gridRender:function(v){
			var fieldName = this._fieldDetails_.header,
				div = '<div class="enum_view_link"' +
				'onclick="AjaxPlugins.Nomenclador.Type.Types.DB_RichText.showText(\''+encodeURIComponent(v)+'\',this,\''+fieldName+'\')">' +
				'Ver' +
				'</div>';
			return div;
		}

    })._apply_({
		showText:function(v,el,fieldName){
			var html = createIframe(decodeURIComponent(v)),
				p = new Ext.Panel({html: html}),
				wind = new Ext.Window({
					title: 'Campo:'+fieldName,
					layout:'fit',
					items: [p],
					modal: true,
					width: 500,
					height: 500
				});
			wind.show();
		}
	}));
    var createIframe = function(v, height){
    	if(!height)
    		height = 500;
		var blob = new Blob([v],{type:'text/html'}),
			url = URL.createObjectURL(blob),
			html = ' <div><iframe src="'+url+'" style="height: '+height+'" class="enum_richTextView" </iframe> </div>';
		return html;

	};

	var grow = Ext.extend(function(){},{
		init:function(fld){
			var id = ('gis_grow')._id_();
			fld.on('afterrender',function(){

				var wrap = fld.el.wrap({
					children:[{
						id: id,
						cls:'gis_grow_button gisIconColorTheme gisTtfIcon_flaticon-increase-size-option'
					}]
				});
				fld.wrap = wrap;
				var el =Ext.Element.get(id).dom;

				el.addEventListener('click',function(){
					var textA = new nom.TiniMce({
						allowBlank: fld.allowBlank
					});
					var w = new addw({
						width:600,
						height:600,
						layout:'fit',
						maximizable: true,
						autoScroll:true,
						title:fld.fieldLabel,
						items:[textA],
						fields:{
							value:textA
						},
						fieldsValues:{
							value:fld.getValue()
						},
						hideApplyButton:true,
						callback:function(d){
							fld.setValue(d.all.value)
						},
						modal:true
					});
					w.show();
				});

				wrap.addClassOnOver('gis_grow_hover');

			});
			fld.getXType = function () {
				return 'tinyMCE_RichTextField';
			};
			fld.getFormVEvtNames = function () {
				return 'valuesetted';
			};
			fld.isValid = function(){
				var v = this.getValue();
				return this.allowBlank || (utils.isString(v) && v !=='');
			}
		}
	});
	var richTextView = Ext.extend(Ext.Panel,{
		allowBlank :null,
		fieldLabel :null,
		height: 100,
		autoScroll: true,
		currentValue: null,
		bodyCfg:{
			tag:'div',
			cls:'enum_richTextView'
		},
		getValue:function(){
			if(this.currentValue === '')
				return null;
			return this.currentValue;
		},
		setValue:function(v){
			var self = this;
			if(!utils.isString(v))
				v = '';
			var f = function(){
				self.el.update( createIframe(v,self.height));
			};
			if(!this.rendered)
				this.on('afterrender',f);
			else f();
			this.currentValue = v;

			this.fireEvent('valuesetted',v);
		}
	})

})();