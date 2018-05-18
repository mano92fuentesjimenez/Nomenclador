/**
 * Created by Mano on 10/05/2017.
 */
(function(){
    var nom = AjaxPlugins.Nomenclador,
        types = nom.Type.Types,
        addType =nom.Type.Utils.addType,
        comps = AjaxPlugins.Ext3_components,
        fields = comps.fields;

    addType('DB_Date',Ext.extend(nom.Type.ValueType, {
            nameToShow :'fecha',
            getValueEditExtComp :function (enumInstance, field) {
                return new fields.DateField({
                    allowBlank: !!field.needed,
                    getFormVEvtNames: function () {
                        return 'valuesetted';
                    },
                    setValue: function (v) {
                        fields.DateField.prototype.setValue.call(this, v);
                        this.fireEvent('valuesetted');
                    }
                });
            },
            gridRender :function (text){
                var date = new Date(text);
               
                return date.toLocaleDateString();
            }
        })
    );
})();