/**
 * Created by Mano on 10/05/2017.
 */

(function(){
	var comps = AjaxPlugins.Ext3_components,
		buttons = comps.buttons,
		utils = Genesig.Utils,
		nom = AjaxPlugins.Nomenclador,
		errorMsg = comps.Messages.slideMessage.error,
		enums = nom.enums,
		addW = AjaxPlugins.Ext3_components.Windows.AddModWindow;

	var tabInjection = {
        closing :function (){
            if (this.CLOSEEEEE)
                return true;
            if (this.hasChanges()) {
                Ext.Msg.show({
                    title :'Guardar los cambios',
                    msg :'Estas cerrando una pestaña con datos sin salvar. Deseas salvarlos?',
                    buttons :Ext.Msg.YESNOCANCEL,
                    fn :this.dialogHandler,
                    animEl :this.body.id,
                    icon :Ext.MessageBox.QUESTION,
                    scope :this
                });
            }
            else this.parent.removeEnum(this.controller._enum.id);
            return false;
        },
        dialogHandler :function (buttonID){
            if (buttonID == 'yes') {
                this.saveAndClose();
            }
            if (buttonID == 'no') {
                this.CLOSEEEEE = true;
                if(this.parent)
                    this.parent.removeEnum(this.controller._enum.id);
            }
        },
        saveAndClose :function (){
            this.CLOSEEEEE = true;
            this.controller.submitChanges && this.controller.submitChanges();
        },
        hasChanges :function (){
            return this.controller.hasChanges && this.controller.hasChanges();
        }
	};

	nom.dataEditorTabPanel = Ext.extend(Ext.TabPanel, {
		//dos nomencladores nunca tienen el mismo nombre
		tabs :null,
		frame :true,
		editorComponent :null,
		enumInstance:null,
        enableTabScroll:true,
		constructor :function (){
			nom.dataEditorTabPanel.superclass.constructor.apply(this, arguments);
			this.tabs = {};
			this.addEvents({'saved' :true});
		},
		addEnumTab :function (_enum){
			if (!this.tabs[_enum.id]) {
				var panel = this.getTab(_enum);

				this.tabs[_enum.id] = panel;
				this.add(panel);
				this.setActiveEnumPanel(_enum);
				// this.doLayout();
				this.ownerCt.doLayout();
			}
		},
		getTab:function(_enum) {

            var funcEnumChange = function (_enum) {
                    panel.parent.removeEnum(_enum.id);
                    nom.getUI(controller.enumInstance).showEnum(_enum);
                    return false;
                },
                funcEnumDeleted = function () {
            		panel.parent.removeEnum(controller._enum.id, true);
                    return false;
                },
                enumObs = enums.getObservableFromEnum(this.enumInstance, _enum),
				controller,
                panel = new Ext.Panel({
                    parent:this,
                    layout:'fit',
                    items:[],
                    title:_enum.name,
                    closable:true
                }),
                config = {
                    enumInstance: this.enumInstance,
                    _enum: _enum,
                    enumInstanceConfig: this.enumInstanceConfig,
                    showTitle:false,
                    maskObj:panel
                },
				self = this;

            if (this.enumInstanceConfig && this.enumInstanceConfig.enumDataEditor)
                controller = new this.enumInstanceConfig.enumDataEditor(config);
            else controller = new nom.GridDataEditor(config);

            controller.destroyUI = controller.destroyUI.createSequence(function(){
            	self.removeEnum(_enum.id);
			});

            panel.controller = controller;
            panel.add(controller.getUI());
            panel.doLayout();

            panel._apply_(tabInjection);
            controller.on('changessubmited', function () {
                if (panel.CLOSEEEEE) {
                    if (panel.parent)
                        panel.parent.removeEnum(this._enum.id);
                    else panel.destroy();
                    return false
                }
            }, controller);
            panel.on('beforeclose', panel.closing, panel);

            enumObs.on('enumchanged', funcEnumChange, panel);
            enumObs.on('enumdeleted', funcEnumDeleted, panel);

            panel.on('destroy', function () {
                enumObs.un('enumchanged', funcEnumChange, panel);
                enumObs.un('enumdeleted', funcEnumDeleted, panel);
            }, panel);

			return panel;
        },
		setActiveEnumPanel :function (_enum){
			this.setActiveTab(this.tabs[_enum.id].getId());
		},
		saveAndClose :function (_enum){
			if (_enum) {
				this.tabs[_enum.id].saveAndClose();
				return;
			}
			for (var key in this.tabs)
				this.tabs[key].saveAndClose();
		},
		removeEnum :function (enumId, notFireEvent){
			this.remove(this.tabs[enumId]);
			delete this.tabs[enumId];
			if (!notFireEvent && Object.keys(this.tabs).length == 0)
				this.fireEvent("saved");
		},
		hasChangesToSave :function (_enum){
			if (_enum) {
				if (this.tabs[_enum.id] == undefined)
					return false;
				return this.tabs[_enum.id].hasChanges();
			}
			for (var key in this.tabs)
				if (this.tabs[key].hasChanges())
					return true;
			return false;
		},
		askToClose :function (_enum, f){
			if (this.hasChangesToSave(_enum))
				Ext.Msg.show({
					title :'Guardar cambios',
					msg :'Para modificar un nomenlador es necesario cerrar la pestaña de edicion de datos. Desea' +
					'guardar?',
					buttons :Ext.Msg.YESNOCANCEL,
					fn :f,
					animEl :this.body.id,
					icon :Ext.MessageBox.QUESTION,
					scope :this
				});
			else f('no')
		},
		closeAll :function (){
			for (var key in this.tabs){
				this.remove(this.tabs[key]);
			}
			this.tabs = {};
		}
	});
})();