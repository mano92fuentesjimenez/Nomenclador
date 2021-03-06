/**
 * Created by Mano on 10/05/2017.
 */
(function() {
	var nom = AjaxPlugins.Nomenclador,
		utils = Genesig.Utils,
		buttons = AjaxPlugins.Ext3_components.buttons,
		addType = nom.Type.Utils.addType;

    /**
	 * Tipo tabla. Su valor es de la forma {@link AjaxPlugins.Nomenclador.Record  Record[]}
	 * @class AjaxPlugins.Nomenclador.Type.Types.DB_Table
     */
	addType('DB_Table', Ext.extend(nom.Type.ValueType, {
			nameToShow: "Tabla",
			getValueEditExtComp: function (enumInstance, field, _enum) {
				var c = new nom.GridOfflineDataEditor({
						_enum: field.properties._enum,
						enumInstance: enumInstance,
						height: 400,
						frame: false
					}),
					ui = c.getUI()._apply_({
						fieldLabel: field.header,
						isGrid: true,
						isDirty: function () {
							return true;
						},
						isValid: function () {
							if (field.needed)
								return c.store.getCount() > 0;
							return true;
						},
						getValue:c.getValue.createDelegate(c),
						setValue:c.setValue.createDelegate(c),
						getFormVEvtNames:function(){
							return ['recordAdded','recordModified','recordDeleted'];
						},
						getXType:function(){
							return 'enumtable';
						}
					});
				c.on('recordAdded',function(){
					ui.fireEvent('recordAdded');
				});
				c.on('recordModified',function(){
					ui.fireEvent('recordModified');
				});
				c.on('recordDeleted',function(){
					ui.fireEvent('recordDeleted');
				});
				return ui;
			},
			getPropertiesExtComp: function (enumInstance, _enumId, fieldId, fields) {
                 return new nom.nomencladorCreator({
                    enumInstance: enumInstance,
                    entityType: 'Tabla',
                    closeAction: 'hide',
                    fieldsMode: true,
                    tpl: 'default',
                    tplConfig: new nom.Tpl({
                        defaultFields: {},
                        dataTypes: {
                            'DB_Bool': true,
                            'DB_String': true,
                            'DB_Number': true,
                            'DB_Description': true,
                        }
                    }),
                    listeners: {
                        'cancel': function () {
                            this.fireEvent('propertynotsetted');
                        }
                    },
                    getValue: function () {
                        return this.getNomenclador();
                    },
                    setValue: function (enumInstance, obj) {
                        this._enum = obj._enum;
                        this.gridStore.removeAll();
                        this.setEnum();
                    },
                });
			},
			gridRender: function (value,metadata,record,rowIndex,collIndex,store,obj) {
				if(value == null)
					return '';
				var field = this._fieldDetails_;
				if(utils.isObject(obj))
					field = obj.field;

				var html = '<div' +
					" props_value= '"+value+"' "+
					" _enum='"+Ext.encode(field.properties._enum)+"' "+
					" enum_instance='"+this._enumInstance_.getName()+"' " +
					" instance_modifier='"+this._enumInstance_.getInstanceNameModifier()+"' "+
					"title= '"+field.header+"' " +
					"onclick='AjaxPlugins.Nomenclador.Type.Types.DB_Table.showValue(this)'>" +
					"<span> Ver Tabla</span>" +
					"</div>";
				return html;
			}
		})._apply_({
		   showValue:function(el) {
			   var value = el.getAttribute('props_value'),
				   instanceName = el.getAttribute('enum_instance'),
				   instanceModifier = el.getAttribute('instance_modifier'),
				   _enum = Ext.decode(el.getAttribute('_enum')),
				   title = el.getAttribute('title'),
				   instance = nom.enums.getInstance(instanceName,instanceModifier),
				   grid = new nom.GridOfflineDataEditor({
					   enumInstance:instance,
					   _enum: _enum,
					   manageEnum:false

				   }),
				   w = new Ext.Window({
					   modal: true,
					   width: 500,
					   height: 500,
					   layout:'fit',
					   title: title,
					   buttons: [
						   new buttons.btnAceptar({
							   handler: function () {
								   w.close();
							   }
						   })
					   ],
					   items: [
						   grid.getUI()
					   ]
				   });
			   grid.getUI().on('afterrender',function() {
				   grid.setValue(value)
			   });
			   w.show();

		   }
		})
	);

})();