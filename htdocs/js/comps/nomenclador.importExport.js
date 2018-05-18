/**
 * Created by mano on 25/04/17.
 */
Ext.onReady(function(){
	var nom = AjaxPlugins.Nomenclador,
		comps = AjaxPlugins.Ext3_components,
		errorMsg = comps.Messages.slideMessage.error,
		buttons = comps.buttons,
		utils = Genesig.Utils,
		fields = comps.fields;


	nom.importExport = Ext.extend(Ext.Window, {
		width :500,
		height :500,
		layout :'fit',
		constructor :function (){
			var tab = new Ext.TabPanel({
				items :[new exportTab(), new importTab()]
			});
			this.items = [
				tab
			];
			nom.importExport.superclass.constructor.apply(this, arguments);
			tab.setActiveTab(0);
		}
	});

	var checkBoxPanel = Ext.extend(Ext.FormPanel,{
		check:function(panel,checkBox){
			var self = this;
			panel.items.items._each_(function(item){
				if( item.items)
					self.check(item, checkBox);
				if(item instanceof Ext.form.Checkbox){
					item.suspendEvents(false);
					if(item == checkBox)
						item.setValue(true);
					else
						item.setValue(false);
					item.resumeEvents();
				}
			});
		},
		constructor:function(){
			checkBoxPanel.superclass.constructor.apply(this, arguments);
		}
	});

	var exportTab = Ext.extend(checkBoxPanel, {
		title :'Exportar nomencladores',
		frame :true,
		exportConfig :null,

		constructor :function (){
			var self =this;
			var defaultCheckB = new Ext.form.Checkbox({
				fieldLabel :'Sin datos',
				handler :function (checkB){
					this.exportConfig = {getEnums :true, getData :false};
					this.check(self,checkB);
				},
				scope :this
			});
			this.items = [
				new Ext.form.FieldSet({
					title :'Exportar nomencladores',
					layout :'form',
					items :[
						defaultCheckB
					]
				})
			];
			this.buttons = [new buttons.btnAceptar({handler :this.accept, scope:this})];
			exportTab.superclass.constructor.apply(this, arguments);
			
			this.on('afterrender',function(){
				defaultCheckB.setValue(true);
			})
		},
		accept :function (){
			var mask = utils.mask(this);
			nom.request('exportEnums',{
				enumInstance:this.enumInstance,
                config:this.exportConfig
            },function(r) {
                window.open(r);
            },null,mask);
		}
	});


	var importTab = Ext.extend(checkBoxPanel, {
		title :'Importar nomencladores',
		fileUpload :true,
		frame :true,
		constructor :function (){
			var pathToJoinIn = new Ext.ux.form.GisTriggerField({
				disabled :true,
				onTrigger2Click :function (){
					nom.showEnumTree(false, function (node){
						pathToJoinIn.setValue(node.node.getPath('text'));
						pathPreffix.setValue(node.path);
					})
				},
				tooltipsTriggers :[
					'Limpiar ruta prefijo de nomencladores a importar',
					'Seleccionar ruta prefijo de nomencladores a importar'
				],
				tooltip :'Ruta prefijo de nomencladores a importar'
			});
			var pathPreffix = new Ext.form.TextField({
				name :'prefix_path',
				hidden :true
			});
			this.items = [
				new Ext.form.FieldSet({
					title :'Seleccionar Archivo de Nomencladores',
					items :[
						new comps.FileUploadTriggerField({
							fieldLabel :'Buscar archivo',
							name :'enum_import_input',
							tooltip :'Buscar el archivo zip con los datos de los nomencladores',
						}),
						{
							layout :'column',
							items :[
								new Ext.form.Label({
									text :'Unir'
								}),
								new fields.Checkbox({
									id :'join_enums',
									//									style:{
									//										padding-right'5px'
									//									},
									tooltip :'Unir nomencladores viejos con los nuevos.',
									listeners :{
										check :function (chB, value){
											pathToJoinIn.setDisabled(!value);
										}
									}
								}),
								pathToJoinIn,
								pathPreffix
							]
						}
					]
				})
			];
			this.buttons = [new buttons.btnAceptar({handler :this.accept, scope :this})];
			importTab.superclass.constructor.apply(this, arguments)
		},
		accept :function (){
			this.getForm().submit({
				url :Genesig.ajax.getLightURL("Nomenclador.default") + "&action=importEnums",
				params:{enumInstance:this.enumInstance},
				success :this.responseHandler,
				failure :this.responseHandler
			});
		},
		responseHandler :function (form, r){
			var response = r.result;
			if (!r.result) {
				errorMsg('Hubo un problema de conecci&oacuten con el servidor.');
				return;
			}
			if (response.ERROR) {
				errorMsg('No se pudieron importar los nomencladores', response.ERROR)
			}
			else {
			}
		}
	});

	
});
