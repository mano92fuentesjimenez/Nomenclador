/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		addType =nom.Type.Utils.addType;

	addType('Db_Table',Ext.extend(nom.Type.ValueType, {
		nameToShow :"Tabla",
		getValueEditExtComp :function (enumInstance, field){
			return new AjaxPlugins.Ext3_components.fields.simpleField({
				allowBlank :!field.needed,
				fieldLabel :field.header
			})
		},
        getPropertiesExtComp :function (enumInstance,_enumId, fieldId, fields){
			var f = function(){
			   var args = [].slice.call(arguments);
			};
          	var creator = new nom.nomencladorCreator({
				enumInstance:enumInstance,
				entityType: 'Tabla',
				closeAction:'hide',
                fieldsMode:true,
				tplConfigs:{
					default:{
						defaultFields:{},
						dataTypes:{
							'DB_Bool':true,
							'DB_String':true,
							'DB_Number':true,
							'DB_Description':true,
						}
					}
				},
                listeners: {
                    "finishedCreation":f,
                    'close':  function() {
                        this.fireEvent('propertynotsetted');
                    }
                },
			});
			return creator;
        },
	}));

})();