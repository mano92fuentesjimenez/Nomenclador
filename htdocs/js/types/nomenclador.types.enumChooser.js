/**
 * Created by Mano on 19 2 2018.
 */
(function(){
    var nom = AjaxPlugins.Nomenclador,
        types = nom.Type.Types,
        fields = AjaxPlugins.Ext3_components.fields,
        addType =nom.Type.Utils.addType;

    /**
     * Es el tipo modelo. Su valor es:
     * ```json
     * {
     *     "valueField":"Id del modelo al que se hace referencia"
     *     "displayField":"Nombre que se muestra del nomenclador al que se hace referencia"
     * }
     * ```
     * @class AjaxPlugins.Nomenclador.Type.Types.DB_EnumChooser
     */
    addType('DB_EnumChooser',Ext.extend(nom.Type.ValueType, {
            nameToShow :'Selector de Entidad',
            getValueEditExtComp :function (enumInstance, field){
                return new nom.EnumTreeTrigger({
                    allowBlank:!field.needed,
                    fieldLabel:field.header,
                    instanceName: enumInstance.getName(),
                    instanceNameModifier: enumInstance.getInstanceNameModifier()
                })
            },
            gridRender :function (value){
                if(value)
                    return value.displayField;
                return '';
            }
        })
    );
})();