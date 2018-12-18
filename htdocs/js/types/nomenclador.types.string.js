/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		addType =nom.Type.Utils.addType;

    /**
	 * Tipo cadena de texto, su valor es una cadena de texto.
	 * @class AjaxPlugins.Nomenclador.Type.Types.DB_String
     */
	addType('DB_String',Ext.extend(nom.Type.ValueType, {
		nameToShow :"Cadena de Texto",
		getValueEditExtComp :function (enumInstance, field){
			return new AjaxPlugins.Ext3_components.fields.simpleField({
				allowBlank :!field.needed,
				fieldLabel :field.header,
				getValue: function(){
					var v = AjaxPlugins.Ext3_components.fields.simpleField.prototype.getValue.call(this);
					if(v == '')
						return;
					return;
				}
			})
		}
	}));

})();