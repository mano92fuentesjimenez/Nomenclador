/**
 * Created by Mano on 10/05/2017.
 */
(function(){
    var nom = AjaxPlugins.Nomenclador,
        addType =nom.Type.Utils.addType;

    addType('DB_Description',Ext.extend(nom.Type.ValueType, {
        nameToShow :"Descripcion",
        getValueEditExtComp :function (enumInstance, field){
            var fld = new AjaxPlugins.Ext3_components.fields.fieldDescripcion({
                allowBlank :!field.needed,
                fieldLabel :field.header,
                height:100
            });

            fld.on('afterrender',function(){
                fld.el.addClassOnOver('enum_desc_hover');
            });
            return fld;


        }
    }));

})();