/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		addType =nom.Type.Utils.addType;

	addType('DB_String',Ext.extend(nom.Type.ValueType, {
		nameToShow :"Cadena de Texto",
		getValueEditExtComp :function (enumInstance, field){
			return new AjaxPlugins.Ext3_components.fields.simpleField({
				allowBlank :!field.needed,
				fieldLabel :field.header
			})
		}
	}));

})();