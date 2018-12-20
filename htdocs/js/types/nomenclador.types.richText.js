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
        addType =nom.Type.Utils.addType;

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
        }
    }));

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
		height:100,
		maxLength: 10000,
		autoScroll: true,
		currentValue: null,
		getValue:function(){
			if(this.currentValue === '')
				return null;
			return this.currentValue;
		},
		setValue:function(v){
			if(!utils.isString(v))
				v = '';

			var blob = new Blob([v],{type:'text/html'}),
				url = Url.createObjectURL(blob),
				html = '<iframe src="'+url+'" style="width: 100%; height: 100%;"></iframe>';

			var el = this.dom

			this.currentValue = v;

			this.fireEvent('valuesetted',v);
		}
	})

})();