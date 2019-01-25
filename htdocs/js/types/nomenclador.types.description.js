/**
 * Created by Mano on 10/05/2017.
 */
(function(){
    var nom = AjaxPlugins.Nomenclador,
		comps = AjaxPlugins.Ext3_components,
		addw = comps.Windows.AddModWindow,
        fields = comps.fields,
		plugins = comps.plugins,
        addType =nom.Type.Utils.addType;

    /**
	 * Tipo descripcion. Es un texto
	 * @class AjaxPlugins.Nomenclador.Type.Types.DB_Description
     */
    addType('DB_Description',Ext.extend(nom.Type.ValueType, {
        nameToShow :"Descripci\u00F3n",
        getValueEditExtComp :function (enumInstance, field){
            var fld = new fields.fieldDescripcion({
                allowBlank :!field.needed,
                fieldLabel :field.header,
                height:100,
                maxLength: 10000,
				plugins:[
					new grow()
				]
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
					var textA = new fields.fieldDescripcion({
						fieldLabel:fld.fieldLabel,
						allowBlank: fld.allowBlank
					});
					textA.setValue(fld.getValue());
					var w = new addw({
						width:600,
						height:600,
						layout:'fit',
						title:fld.fieldLabel,
						items:[textA],
						fields:{
							value:textA
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
		}
	})

})();