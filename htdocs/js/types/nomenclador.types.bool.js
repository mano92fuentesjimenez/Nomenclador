/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		types = nom.Type.Types,
		addType =nom.Type.Utils.addType;
    /**
	 * @class AjaxPlugins.Nomenclador.Type.Types.DB_Bool
	 * @description Tipo booleano, sus valores son:
	 * ```javascript
	 * true
	 * false
	 * ```
     */

	addType('DB_Bool',Ext.extend(nom.Type.ValueType,
        /**
		 * @lends AjaxPlugins.Nomenclador.Type.Types.DB_Bool
         */
		{
			nameToShow :'Boolean',
			getValueEditExtComp :function (enumInstance, field){
				return new AjaxPlugins.Ext3_components.fields.Checkbox({
					fieldLabel :field.header
				})
			},
			gridRender :function (text){
				text = types.DB_Bool.superclass.gridRender.apply(this, arguments);
				return '<div class=' + (text.toString() == "true" ?
						'"active-image"' :
						'"inactive-image"') + '></div>';
			}
		})
	);
})();