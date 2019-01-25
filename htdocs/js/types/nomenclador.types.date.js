/**
 * Created by Mano on 10/05/2017.
 */
(function(){
    var nom = AjaxPlugins.Nomenclador,
        types = nom.Type.Types,
        addType =nom.Type.Utils.addType,
        comps = AjaxPlugins.Ext3_components,
        fields = comps.fields;

    /**
     * Tipo fecha. El valor que puede tomar es el mismo especificado por ISO 8601. Especificado en la opcion c del objeto fecha de Ext
     * @class AjaxPlugins.Nomenclador.Type.Types.DB_Date
     */
    addType('DB_Date',Ext.extend(nom.Type.ValueType,
        /**
         * @lends AjaxPlugins.Nomenclador.Type.Types.DB_Date
         */
        {
            nameToShow :'Fecha',
            getValueEditExtComp :function (enumInstance, field) {
                return Window.enumDate = new fields.DateField({
                    fieldLabel:field.header,
                    allowBlank: !field.needed,
                    getFormVEvtNames: function () {
                        return 'valuesetted';
                    },
                    setValue: function (v) {
                        if(v === null)
                            v = '';
                        fields.DateField.prototype.setValue.call(this, v);
                        this.fireEvent('valuesetted');
                    }
                });

            },
            gridRender :function (text){
                if(text == null)
                    return '';
                var date = new Date(text);
               
                return date.toLocaleDateString();
            }
        })
    );
})();