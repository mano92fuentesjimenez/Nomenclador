/**
 * Created by Mano on 10/05/2017.
 */
(function(){
    var nom = AjaxPlugins.Nomenclador,
        addw = AjaxPlugins.Ext3_components.Windows.AddModWindow,
        fields = AjaxPlugins.Ext3_components.fields,
        addType =nom.Type.Utils.addType;

    addType('DB_Description',Ext.extend(nom.Type.ValueType, {
        nameToShow :"Descripcion",
        getValueEditExtComp :function (enumInstance, field){
            var fld = new fields.fieldDescripcion({
                allowBlank :!field.needed,
                fieldLabel :field.header,
                height:100
            });
            var id = ('desc')._id_();

            nom.Type.Types.DB_Description.instances[id]=fld;

            fld.on('afterrender',function(){

                var wrap = fld.el.wrap({
                    children:[{
                        cls:'enum_desc_button',
                        onclick:'AjaxPlugins.Nomenclador.Type.Types.DB_Description.showDescription("'+id+'")'
                    }]
                });
                fld.wrap = wrap;
                wrap.addClassOnOver('enum_desc_hover');

            });
            fld.on('destroy',function () {
                delete nom.Type.TYpes.DB_Description.instances[id];
            });
            return fld;
        }
    })._apply_({
        instances:{},
        showDescription:function(instance){
            var field = nom.Type.Types.DB_Description.instances[instance];

            var textA = new fields.fieldDescripcion({
                fieldLabel:field.fieldLabel,
                allowBlank: field.allowBlank
            });
            textA.setValue(field.getValue());
            var w = new addw({
                width:600,
                height:600,
                layout:'fit',
                title:field.fieldLabel,
                items:[textA],
                fields:{
                    value:textA
                },
                hideApplyButton:true,
                callback:function(d){
                    field.setValue(d.all.value)
                },
                modal:true
            });
            w.show();
        }
    }));

})();