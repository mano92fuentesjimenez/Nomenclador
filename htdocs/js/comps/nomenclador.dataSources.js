/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var comps = AjaxPlugins.Ext3_components,
		FormValidator = Genesig.Componentes.FormValidator,
		fields = comps.fields,
		buttons = comps.buttons,
		nom = AjaxPlugins.Nomenclador,
		errorMsg = comps.Messages.slideMessage.error,
		infoMsg = comps.Messages.slideMessage.info,
		wd = AjaxPlugins.Ext3_components.Windows.AddModWindow;

	nom.dataSourceGenerator = comps.Windows.AddModWindow._createSubClass_({
		fields : null,
		height:490,
		width:300,
		modal:true,
		frame:true,
		prefix:'fuente de datos',
		dataConfigs : null,
		btnCheck : null,
		constructor : function(config,values,pCallb){
			var self = this;

			this._apply_(this._default_(config,{}));

			this.callbackFn = this._default_(this.callback,function(){});

			this.btnCheck = new Ext.Button({
				text: 'Probar conexi&oacute;n',
				iconCls : 'gis_cambiar',
				scope:this,
				handler : this.testDBConection
			});

			this.createFields();

			if(values && values._isObject_()){
				this.fieldsValues = values;
			}

			this._parent_({
				layout:'fit',
				items:[
					{
						frame:true,
						layout:'form',
						labelAlign:'top',
						defaults:{
							anchor:'100%',
							allowBlank : false
						},
						items:[
							this.fields.name,
							this.fields.dataSourceType,
							this.fields.host,
							this.fields.port,
							this.fields.user,
							this.fields.pass,
							this.btnCheck,
							this.fields.dbname,
							this.fields.schema
						]
					}
				],
				callback : function(pValues){
					self.finishCreation();
				}
			});

			this.btnAceptar.handler = this.finishCreation;
			this.btnAceptar.scope = this;
			this.btnAplicar.handler = this.applyCreation;
			this.btnAplicar.scope = this;

			this.loadConfigs();

			this.on({
				afterrender : function(){
					this.createValidators();
					this.formValidators.dbRoute.check();
				}
			});

			this.show();
		},
		finishCreation : function(){
			var values = this.getFieldsValues();
			var self = this;
			var mask = Genesig.Utils.mask(this);
			this.fireEvent('finishcreation',values, function(cb){
				mask();
				if(cb)
					self.close()
			});

		},
		applyCreation:function(){
			var values = this.getFieldsValues();
			var mask = Genesig.Utils.mask(this);
			this.fireEvent('finishcreation',values, function(cb){
				mask();

			});
		},
		testDBConection : function(){
			var mask = Genesig.Utils.mask(this,'Conect&aacute;ndose a la base de datos: '+this.fields.name.getValue()),
				disabled = true,
				dbFld = this.fields.dbname,
				self = this;
			nom.request('getDataBasesNames',this.getFieldsValues()._apply_({enumInstance:this.enumInstance}),function(r,o) {
				infoMsg('La conexi&oacute;n se ha realizado satisfactoriamente.');

				var st = dbFld.store;

				st.removeAll();
				st.loadData(r._map_(function(pV,pK) {
                    return {
                        value: pV.name
                    };
                }));
				disabled = false;
				if(st.getCount() > 0){
					dbFld.setValue(st.getAt(0).get(dbFld.valueField));
					self.loadDBSchemas(true);
				}
                dbFld.setDisabled(disabled);
                self.fields.schema.setDisabled(disabled);
            },function (error) {
				if(error.type =='EnumDBNotExistException')
				{
					infoMsg('La conexi&oacuten no se pudo realizar');
                    dbFld.setValue('');
                    self.fields.schema.setValue('');
                    self.fields.dbname.setValue('');
                    self.fields.schema.setDisabled(true);
                    self.fields.dbname.setDisabled(true);
                    self.formValidator.check();
                    return true;
				}
				return null
            },mask);
		},
		loadConfigs : function(pCallback){
			var mask = Genesig.Utils.mask(this,'Cargando configuraciones.'),
				callcb = this._default_(pCallback,function(){}),
				self = this;

			nom.request('getDbConfigs',{enumInstance:this.enumInstance},function (r) {
                self.dataConfigs = Ext.util.JSON.decode(r.responseText);
                callcb(self.dataConfigs);
                mask();
            },function(){self.close();},mask);
		},
		createValidators : function(){
			var flds = this.fields,
				fVs = this.formValidators = {},
				fV = FormValidator;

			fVs.dbRoute = new fV({
				checkDirty : false,
				fields : [
					flds.host,
					flds.port,
					flds.user,
					flds.pass
				],
				buttons : [
					this.btnCheck
				]
			});
		},
		getFieldsValues : function(){
			return {
				name : this.fields.name.getValue(),
				id:this.fieldsValues['id'],
				user:this.fields.user.getValue(),
				password:this.fields.pass.getValue(),
				port:this.fields.port.getValue().toString(),
				host:this.fields.host.getValue(),
				schema : this.fields.schema.getValue(),
				dataSource:this.fields.dataSourceType.getValue(),
				dbname:this.fields.dbname.getValue()
			};
		},
		loadDBSchemas : function(pBD){
			var schema = this.fields.schema,
				st = schema.store,
				self = this;

			st.removeAll();

			if(pBD) {
                var mask = Genesig.Utils.mask(this, 'Cargando esquemas.');

                nom.request('getDbSchemas', {
                	enumInstance:this.enumInstance,
                    conn:this.getFieldsValues()
                }, function (r) {
                    mask();
                    st.loadData(r._map_(function (pV) {
                        return {
                            value: pV.schema
                        };
                    }));

                    if (st.getCount() > 0) {
                        schema.setValue(st.getAt(0).get(schema.valueField));
                        self.formValidator.check();
                    }
                }, function () {
                    self.close()
                }, mask());
            }
		},
		createFields : function(){
			var self = this;

			this.fields = {
				name:  new fields.fieldDenom({
					anchor:'100%',
					validateValue : function(v){
						var valid = fields.fieldDenom.prototype.validateValue.apply(this,arguments),
							cfgs = self.dataConfigs;
						if(!cfgs || v === self.modifying)
							return valid;

						if(valid){
							valid = cfgs._queryBy_(function(pV){
									return pV.id == v;
								}).length == 0;
							if(!valid){
								this.markInvalid('Ya existe una fuente de datos con esta denominaci&oacute;n.');
							}
						}
						return valid;
					},
                    tooltip:'Denominaci&oacute;n de la fuente de datos'
				}),
				dataSourceType : new fields.comboBox({
					fieldLabel: "Tipo de fuente de Datos",
					displayField: "type",
					lazyInit: true,
					valueField: "type",
					store: new Ext.data.JsonStore({
						data: nom.dbType.Utils.getDbTypesDict()._map_(function(pV,pK){
							return {
								type: pK
							};
						},this,false),
						fields: ["type", "panel"]
					}),
					triggerAction: "all",
					mode: "local",
					readOnly: true,
					listeners: {
						afterrender : function(){
							this.setValue(this.store.getAt(0).get(this.valueField));
						}
					},
                    tooltip:'Tipo de fuente de datos'
				}),
				host : new fields.simpleField({
					fieldLabel : 'Direcci&oacute;n',
					value:'localhost',
                    tooltip:'Direcci&oacute;n de la fuente de datos'
				}),
				port : new fields.numberField({
					allowBlank:false,
					minLength:1,
					value:5432,
					maxLength:Math.pow(2,32),
					fieldLabel:"Puerto",
                    tooltip:'Puerto de la fuente de datos'
				}),
				user : new fields.simpleField({
					fieldLabel: 'Usuario',
					tooltip:'Usuario de la fuente de datos'
				}),
				pass : new fields.fieldPasswd({
					fieldLabel : 'Contrase&ntilde;a',
					tooltip:'Contrase&ntilde;a de la fuente de datos'
				}),
				dbname : new fields.simpleComboBox({
					mode:'local',
					forceSelection : false,
					valueField: 'value',
					displayField : 'value',
					store : new Ext.data.JsonStore({
						data: [],
						fields: ['value']
					}),
					disabled : true,
					fieldLabel : 'Base de datos',
					listeners : {
						scope:this,
						keyup : function(){
							this.loadDBSchemas(false);
						},
						select : function(){
							this.loadDBSchemas(true);
						}
					},
                    tooltip:'Seleccionar la base de datos'
				}),
				schema : new fields.simpleComboBox({
					mode:'local',
					forceSelection : false,
					valueField: 'value',
					displayField : 'value',
					store : new Ext.data.JsonStore({
						fields:["value"],
						data:[]
					}),
					disabled : true,
					fieldLabel : 'Esquema',
                    tooltip:'Seleccionar el esquema'
				})
			};
		}
	});

	nom.dataSourcesList = AjaxPlugins.Ext3_components.grid.dynamicListWindow._createSubClass_({

		dataProxy : function(pCallback){
            var self = this;
			nom.request('getDbConfigs',{enumInstance:this.enumInstance},function (r) {
                pCallback(r._map_(function(o){
                    return o;
                },self,false));
            },function () {
                errorMsg( "Ha fallado la coneccion con el servidor");
                pCallback(false);
            })
		},
		constructor : function(pCfg){
			this._apply_(pCfg);

			var cb = this._default_(this.callback, function(){});

			this._parent_({
				title:'Gestionar fuentes de datos',
				tbar:[
					new buttons.btnAdicionar({
						handler : this.addDataSource,
						scope:this,
						tooltip:'Adicionar fuente de datos'
					}),
					new buttons.btnModificar({
						handler: this.modDataSource,
						scope:this,
						tooltip:'Modificar fuente de datos'
					}),
					new buttons.btnDelete({
						handler:this.delDataSource,
						scope:this,
						tooltip:'Eliminar fuente de datos'
					}),
                    new comps.Button({
                        text: 'Clonar',
                        iconCls : 'gis_cambiar',
                        handler: this.cloneDataSource,
                        scope:this,
                        tooltip:'Clonar fuente de datos'
                    }),
					'->'
				],
				width:'60%',
				gridConfig : {
					store : new Ext.data.JsonStore({
						fields: [
							'name',
							'id',
							'dataSource',
							'host',
							'port',
							'schema',
							'dbname',
							'user'
						],
						data:[]
					}),
					viewConfig:{
						forceFit:true,
					},
					tbar:['->',
						new buttons.btnActualizar({
							handler: function (){
								this.reloadData();
							},
							scope:this
						})],
					columns : [
						{
							header : 'Denominaci&oacute;n',
							dataIndex : 'name'
						},
						{
							header : 'Tipo',
							dataIndex : 'dataSource'
						},
						{
							header : 'Direcci&oacute;n',
							dataIndex : 'host'
						},
						{
							header : 'Puerto',
							dataIndex : 'port'
						},
						{
							header : 'Nombre BD',
							dataIndex : 'dbname'
						},
						{
							header : 'Esquema',
							dataIndex : 'schema'
						},
						{
							dataIndex : 'id',
							hidden:true
						},
						{
							dataIndex : 'user',
							hidden:true
						},
					]
				},
				callback : function(r){
					cb(r[0].id);
				}
			});

			this.show();
		},
		submitDataSource:function(dataSource, mode, info, callback){
			var self = this,
				request = function(){
				if(dataSource['password'])
					dataSource['password'] = RSA.encrypt(dataSource['password'], nom.publicKey);

				nom.request(mode,{
                    "config" :dataSource,
					enumInstance:self.enumInstance
                },function (r){
                    infoMsg(info);
                    callback(true, r);
                },function (){
                    callback(false);
                })
			};

			if(nom.publicKey == null) {
				nom.request('getPublicKey',null,function (r){
                    nom.publicKey = RSA.getPublicKey(r.publicKey);
                    request();
                },function(){callback(false)})
			}
			else request();

		},
		addDataSource: function (){
			var self = this;

			new nom.dataSourceGenerator({
				enumInstance:this.enumInstance,
				listeners:{
					"finishcreation":function(dataSource,f){
						self.submitDataSource(dataSource,
							'addDbConfig',
							'La fuente de datos ha sido adicionada satisfactoriamente.',
							function(r,result) {
								if(!r) {
                                    f(r);
                                    return;
                                }

                                var s = self.gridPanel.getStore();
                                dataSource.id = result;
                                var rec = new s.recordType(dataSource);
                                s.add([rec]);
                                f(r);
                            });
					}
				}
			});
		},
		modDataSource: function(){
			var self = this;
			var recordSelected =this.gridPanel.getSelectionModel().getSelected();
			var values = recordSelected.data._clone_();

			delete values['dbname'];
			delete values['schema'];

			new nom.dataSourceGenerator({enumInstance:this.enumInstance,
				listeners:{
					"finishcreation":function(dataSource,f){
						self.submitDataSource(dataSource,'modDbConfig',
							'La fuente de datos ha sido modificada satisfactoriamente',
							function(result) {
								if(result) {
                                    var s = self.gridPanel.getStore();
                                    s.remove(recordSelected);
                                    var rec = new s.recordType(dataSource);
                                    s.add([rec]);
                                }
                                f(result);
                            });
					}
				},
				fieldsValues:values,
				modifying:values['name']
			});
		},
		cloneDataSource:function(){
			var self = this;
			var values = this.gridPanel.getSelectionModel().getSelected().data._clone_();

			delete values['dbname'];
			delete values['schema'];
			delete values['id'];
			delete values['name'];

			new nom.dataSourceGenerator({enumInstance:this.enumInstance,
				listeners:{
					"finishcreation":function(dataSource,f){
						self.submitDataSource(dataSource,'addDbConfig','Se ha modificado la fuente de datos '+
							dataSource.id + ' satisfactoriamente',function(r, result){
							if(r) {
                                var s = self.gridPanel.getStore();
                                var rec = new s.recordType(dataSource);
                                s.add([rec]);
                            }
							f(r);
						});
					}
				},
				fieldsValues:values
			});
		},
		delDataSource:function(){
			var self = this;
			AjaxPlugins.Ext3_components.Messages.MessageBox.confirm( "Confirmaci&oacute;n","&iquest;Est&aacute; seguro que desea eliminar la fuente de datos seleccionada?",function(t){
				if(t == 'ok') {
                    var selected = self.gridPanel.getSelectionModel().getSelected();
                    var mask = Genesig.Utils.mask(self.gridPanel, 'Eliminando fuente de datos');
                    nom.request('delDataSource',
						{id: selected.get('id'), enumInstance:self.enumInstance},
						function (r) {
                            self.gridPanel.getStore().remove(selected);
                        }, null, mask);
                }
			});
		}
	});

})();