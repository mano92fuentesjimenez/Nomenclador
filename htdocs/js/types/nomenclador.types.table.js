/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		addType =nom.Type.Utils.addType;

	addType('DB_Table',Ext.extend(nom.Type.ValueType, {
		nameToShow :"Tabla",
		getValueEditExtComp :function (enumInstance, field,_enum) {
			var c = new nom.GridOfflineDataEditor({

					_enum: field.properties._enum,
					enumInstance: enumInstance,
					height: 400,
					frame: false
				}),
				ui = c.getUI()._apply_({
					isGrid: true,
					getValue: function () {
						var values = [];
						c.store.each(function (r) {
							values.push(r.data);
						});
						return Ext.encode(values);
					},
					setValue: function (v) {
						c.loadData(Ext.decode(v));
					},
					isDirty: function () {
						return true;
					},
					isValid: function () {
						if (field.needed)
							return c.store.getCount() > 0;
						return true;
					},
					getFormVEvtNames: function () {
						return 'datachanged';
					}

				});

			return ui;
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
                    'cancel':  function() {
                        this.fireEvent('propertynotsetted');
                    }
                },
			});
			return creator;
        },
	}));

})();