/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var comps = AjaxPlugins.Ext3_components,
		buttons = comps.buttons,
		utils = Genesig.Utils,
		nom = AjaxPlugins.Nomenclador,
		enums = nom.enums,
		errorMsg = comps.Messages.slideMessage.error,
		infoMsg = comps.Messages.slideMessage.info;

	/**
	 * Ventana que permite gestionar los nomencladores del sistema
	 * @extends     Ext.GWindow
	 */
	nom.nomencladorEditor = Ext.extend(Ext.GWindow, {
		width: 900,
		height: 500,
		treePanel: null,
		visorTabPanel: null,
		gridEditor: null,
		gridStore: null,
		selectedNode: null,
		layout: 'border',
		resizable: true,
		maximizable:true,
		collapsible:true,
		title:'Gestionar nomencladores',
		indexedTreePlg : null,
		nomencladorPlugins : null,

		enumsTreePanelToolbar : null,
		enumsEditPanelToolbar : null,
		dataSourcesPanelToolbar : null,

		dataSourcesPanelPlugins : null,
		enumsEditPanelPlugins: null,

		// addControl2EnumsTreePanel : function(pControlConfig,pEnableEvaluator){
		// 	var self = this;
        //
		// 	this.menuOptions.registerItem([
		// 		{}._apply_(pControlConfig,{
		// 			handler : function(pMn){
		// 				pControlConfig.handler(
		// 					self.treePanel,pMn.showParams.object.attributes
		// 				);
		// 			},
		// 			isEnabled : function(pMn){
		// 				return pEnableEvaluator(pMn.showParams.object.attributes);
		// 			}
		// 		})
		// 	]);
        //
		// }._defaults_({},function(){return true;}),
        //
		// addControl2EnumsEditPanel : function(pControlConfig,pEnableEvaluator){
		// 	var plgs = this.enumsEditPanelPlugins = this._default_(this.enumsEditPanelPlugins,[]);
        //
		// 	plgs.push({
		// 		cfg : null,
		// 		evaluator : null,
		// 		enumDataList : null,
		// 		constructor : function(){
		// 			this.cfg = pControlConfig;
		// 			this.evaluator = pEnableEvaluator;
		// 		},
		// 		init : function(pList){
		// 			var wdwList = this.enumDataList = pList;
        //
		// 			wdwList.onGridEditorCreated(function(){
		// 				this.renderBtn();
		// 			},this);
		// 		},
		// 		renderBtn : function(){
		// 			var self = this,
		// 				dList = this.enumDataList,
		// 				grid = dList.gridEditor,
		// 				selM = grid.getSelectionModel(),
		// 				handler = this.cfg.handler,
		// 				btn = new comps.Button({}._apply_(this.cfg,{
		// 					handler : function(){
		// 						handler(
		// 							self.enumDataList,
		// 							grid.store,
		// 							selM.getSelections()._map_(function(pRec){
		// 								return pRec.data;
		// 							})
		// 						);
		// 					}
		// 				}));
        //
		// 			grid.getTopToolbar()[(!grid.rendered ? 'push' : 'add')](btn);
        //
		// 			selM.on('selectionchange',function(){
		// 				var sel = selM.getSelected();
		// 				btn.setDisabled(!this.evaluator(sel ? sel.data : null));
		// 			},this);
		// 		}
		// 	}._createClass_());
		// }._defaults_({},function(){return true;}),
        //
		// addControl2DataSourcesPanel : function(pControlConfig,pEnableEvaluator){
		// 	var plgs = this.dataSourcesPanelPlugins = this._default_(this.dataSourcesPanelPlugins,[]);
        //
		// 	plgs.push({
		// 		cfg : null,
		// 		evaluator : null,
		// 		dataSourcesList : null,
		// 		constructor : function(){
		// 			this.cfg = pControlConfig;
		// 			this.evaluator = pEnableEvaluator;
		// 		},
		// 		init : function(pList){
		// 			var wdwList = this.dataSourcesList = pList;
        //
		// 			if(wdwList.rendered){
		// 				this.renderBtn();
		// 			}else{
		// 				wdwList.on('afterrender',this.renderBtn,this);
		// 			}
        //
		// 		},
		// 		renderBtn : function(){
		// 			var self = this,
		// 				selM = this.dataSourcesList.gridPanel.getSelectionModel(),
		// 				handler = this.cfg.handler,
		// 				btn = new comps.Button({}._apply_(this.cfg,{
		// 					handler : function(){
		// 						handler(
		// 							self.dataSourcesList,
		// 							selM.getSelections()._map_(function(pRec){
		// 								return pRec.data;
		// 							})
		// 						);
		// 					}
		// 				}));
        //
		// 			this.dataSourcesList.getTopToolbar().add(btn);
        //
		// 			selM.on('selectionchange',function(){
		// 				var sel = selM.getSelected();
		// 				btn.setDisabled(!this.evaluator(sel ? sel.data : null));
		// 			},this);
		// 		}
		// 	}._createClass_());
        //
		// }._defaults_({},function(){return true;}),

		constructor: function () {

			this.enumInstance = arguments[0].enumInstance;
			this.enumInstanceConfig = arguments[0].enumInstanceConfig;
			if( this.enumInstanceConfig == null)
			    this.enumInstanceConfig = {};

			this.treePanel = new nom.treeEditorPanel({
				region:'center',
				listeners: {
					"enumselected": this.nodeClicked,
					scope: this
				},
				canMoveEnums:true,
				enumInstance:this.enumInstance,
				enumInstanceConfig:this.enumInstanceConfig,
                maskObj: this
			});

			this.visorTabPanel = new nom.dataEditorTabPanel({
				region: 'center',
				editorComponent : this,
				items: [],
				enumInstance: this.enumInstance,
				enumInstanceConfig:this.enumInstanceConfig
			});

			nom.nomencladorEditor.superclass.constructor.call(this, Ext.apply(arguments[0] || {}, {
				items: [
					{
						region: 'west',
						width: 250,
						title:'Estructura',
						split:true,
						layout:'border',
						items:[
							this.treePanel
						]
					},
					this.visorTabPanel
				]
				// bbar:["->",closeWindowB]
			}));
			var cfg = AjaxPlugins.Nomenclador.getRenderConfig().plugins;
			this.initializeEvents();

			this.on({
				// afterrender : this.initializePlugins._delegate_(
				// 	[
				// 		cfg.plugins,
				// 		cfg
				// 	]
				// ),
				beforeclose : this.closeEditorWindow
			})
		},
		// initializePlugins : function(pLoadPlgs,pConfig){
		// 	var self = this,
		// 		plgs = this.nomencladorPlugins = {},
		// 		loadJs = [];
        //
		// 	pLoadPlgs._each_(function(pV,pK){
		// 		var nm = pV+'Load';
		// 		if(nm in pConfig && pConfig[nm] && pConfig[nm]._isArray_()){
		// 			loadJs = loadJs.concat(pConfig[nm]);
		// 		}
		// 	});
        //
		// 	loadDynamicConfig.executeLoadArray(loadJs,function(){
		// 		AjaxPlugins.Nomenclador.plugins._each_(function(pFn,pK){
		// 			this[pK] = new pFn(self);
		// 		},plgs);
		// 	},null,function(){
        //
		// 	},true);
		// }._defaults_([],{}),
        initializeEvents:function(){
		    var self = this;
		    this.on('enummodified',function(_enum){
                self.visorTabPanel.addEnumTab(_enum);
            });
            this.on('enumremoved',function(_enum){
                self.visorTabPanel.removeEnum(_enum.id)
            });
            // this.on('enumremoved',function(_enum){
            //     self.visorTabPanel.removeEnum(_enum.id)
            // });

            this.treePanel.askToChangeEnum = function(_enum,f){
                self.visorTabPanel.askToClose(_enum, function (option) {
                    if (option === 'cancel')
                        return;
                    if (option === 'yes')
                        self.visorTabPanel.saveAndClose(_enum);
                    if (option === 'no')
                        self.visorTabPanel.removeEnum(_enum.id);
                    f();
                });
            }
        },
		closeEditorWindow: function () {
			if(AjaxPlugins.Nomenclador.highLightedGeometries){
				AjaxPlugins.Nomenclador.highLightedGeometries.destroy();
				AjaxPlugins.Nomenclador.highLightedGeometries = null;
			}
			if (this.CLOSEEEEE)
				return true;
			if (this.visorTabPanel.hasChangesToSave())
				Ext.Msg.show({
					title: 'Guardar los cambios',
					msg: 'Estas cerrando una pestaña con datos sin salvar. Deseas salvarlos?',
					buttons: Ext.Msg.YESNOCANCEL,
					fn: this.dialogHandler,
					icon: Ext.MessageBox.QUESTION,
					scope: this
				});
			else return true;
			return false;
		},
		dialogHandler: function (buttonId) {
			if (buttonId == "yes") {
				this.visorTabPanel.saveAndClose();
				this.visorTabPanel.on("saved", function () {
					this.CLOSEEEEE = true;
					this.close();
				}, this)
			}
			if (buttonId == "no") {
				this.CLOSEEEEE = true;
				this.close();
			}
		},

		nodeClicked: function (_enum) {
			this.visorTabPanel.addEnumTab(_enum);
			this.visorTabPanel.setActiveEnumPanel(_enum);
		},

		/**
		 * Muestra el enum en el visor 
		 * @param _enum {string| object} Id del enum o el enum a mostrar.
		 */
		showEnum:function(_enum){
			var _enum = _enum._isString_() ? enums.getEnumById(this.enumInstance, _enum) : _enum;
			this.visorTabPanel.addEnumTab(_enum);
			
		},
		initValues : function(){
			return this.treePanel.initValues();
		}

	});

	nom.treeEditorPanel = Ext.extend(nom.nomencladorTree,{
	    //label de la entidad en la interfaz
	    entityType : 'nomenclador',
        addRankButtonText :'categor&iacute;a',
        animate: true,
        autoScroll: true,
        canMoveEnums:true,
        askToChangeEnum:null,
        enumInstanceConfig:null,
        maskObj:null,
        constructor: function (cfg) {

            var self = this;
            this.enumInstance = arguments[0].enumInstance;
            this.enumInstanceConfig = arguments[0].enumInstanceConfig || {};
            this._apply_(cfg);

            this.initializeMenu();
            this.tbar=[
                '->',
                {
                    iconCls:'gis_adicionar',
                    text: '',
                    handler : function(pBtn,pEv){
                        self.showMenuOptions(self.getSelectionModel().getSelectedNode(),pEv);
                    }
                },
                {
                    iconCls:'layerposgis',
                    text: '',
                    handler : function(pBtn,pEv){
                        var wdw = new nom.dataSourcesList({
                            enumInstance:self.enumInstance,
                            width:'60%',
                            plugins : self.dataSourcesPanelPlugins ? self.dataSourcesPanelPlugins._map_(function(pV){
                                return new pV;
                            }) : undefined
                        });
                    }
                },
                {
                    iconCls:'gisTtfIcon_flaticon-exchange-arrows gisFontTheme',
                    handler:function(){
                        (new nom.importExport()).show();
                    },
                    tooltip:'Importar o exportar nomencladores',
                    hidden:true

                },
                new buttons.btnActualizar({
                    text: '',
                    handler : function(pBtn,pEv){
                        self.initValues();
                    }
                })
            ];

            nom.treeEditorPanel.superclass.constructor.call(this,cfg);
            this.initializeEvents();

        },
        isARankNode: function (node) {
            return !!(node.isRoot || node.attributes._type_ == 'category');
        },
		initializeEvents:function(){
        	this.on('contextmenu', this.showMenuOptions, this);
        	this.on('afterrender',function(panel){

                var self = this;
                panel.el.on('contextmenu', function (pE) {
                    pE.stopEvent();
                    pE.stopPropagation();
                    self.showMenuOptions(panel.root, pE);

                });
            }, this);
            this.on("render", function () {
                toolTip = new Ext.ToolTip({
                    target: this.body,
                    delegate: ".enum_tree_node",
                    trackMouse: true,
                    renderTo: document.body,
                    listeners: {
                        "beforeshow": function (t) {
                            var _enumName = t.triggerElement.innerText;
                            var _enum = enums.getEnumByName(self.enumInstance, _enumName);
                            if (_enum.description == "")
                                return false;
                            t.body.dom.innerHTML = "<h1>" + _enum.description + "<h1>";
                        }
                    }
                })
            }, this);
        },
        initializeMenu : function(){
            var mn = this.menuOptions = new comps.MenuDynamic(false);

            mn.registerItem(
                [
                    {
                        text: 'Adicionar '+ this.addRankButtonText ,
                        iconCls : 'gis_adicionar',
                        handler: this.proccessAction._delegate_('add_category',this, true)
                    }
                ],
                ['root','categoria','nomenclador']
            );

            mn.registerItem(
                [
                    {
                        text: 'Renombrar '+ this.addRankButtonText,
                        iconCls : 'gis_modificar',
                        handler: this.proccessAction._delegate_('mod_category',this, true)
                    },
                    {
                        text: 'Eliminar '+this.addRankButtonText,
                        iconCls : 'gis_eliminar',
                        handler: this.proccessAction._delegate_('rem_category',this, true)
                    }
                ],
                'categoria'
            );

            mn.registerItem(
                [
                    {
                        text: 'Modificar '+ this.entityType,
                        iconCls : 'gis_modificar',
                        handler: this.proccessAction._delegate_('mod_enum',this, true)
                    },
                    {
                        text: 'Eliminar '+this.entityType,
                        iconCls : 'gis_eliminar',
                        handler: this.proccessAction._delegate_('rem_enum',this, true)
                    }
                    //                    ,{
                    //                        text:'Eliminar en cascada',
                    //                        handler: this.proccessAction._delegate_('del_on_cascade',this)
                    //                    }
                ],
                'nomenclador'
            );

            var addEnumMenu = (this.enumInstanceConfig.tpl || {})._queryBy_(function(v,k){
                return k !== 'default';
            },this,true)._map_(function(v,k){
                return {
                    text:k,
                    handler:this.proccessAction._delegate_(['add_enum',k],this, true)
                };
            },this,false);
            addEnumMenu = addEnumMenu._length_() ===0?undefined:addEnumMenu;

            mn.registerItem(
                [
                    {
                        text: 'Adicionar '+this.entityType,
                        iconCls : 'gis_adicionar',
                        handler: this.proccessAction._delegate_(['add_enum','default'],this, true),
                        menu:addEnumMenu
                    }
                ],
                ['categoria','nomenclador']
            );
        },
        showMenuOptions : function(pNd,pEv){
            var node = pNd instanceof Ext.tree.TreeNode ? pNd : this.root,
                atrs = node.attributes,
                type = node.isRoot ? 'root' : (this.isARankNode(node) ? 'categoria' : 'nomenclador');

            this.menuOptions.show(type,pEv,node);
        },

        proccessAction : function(pParams,mouseEvt,pAction, tpl){
            var nd = pParams.showParams.object,
                actions = {
                    add_category : function(pN){
                        this.addRank();
                    },
                    mod_category : function(pN){
                        this.modRank(pN);
                    },
                    rem_category : function(pN){
                        this.removeRank(pN);
                    },
                    mod_enum : function(pN){
                        this.modNomenclador(pN, tpl);
                    },
                    rem_enum : function(pN){
                        this.removeNomenclador(pN)
                    },
                    add_enum : function(pN){
                        this.addNomenclador(tpl);
                    },
                    del_on_cascade:function(pN){
                        this.deleteOnCascade(pN);
                    }
                };

            this.selectedNode = nd;

            if(pAction in actions){
                actions[pAction].call(this,nd);
            }
        },
        addNomenclador: function (tpl) {
            var self = this;
            nom.request('hasDataSources',{enumInstance:this.enumInstance},function (resp) {
                if (!resp) {
                    errorMsg( "Debe crear una fuente de datos para poder crear un nomenclador");
                    return;
                }
                (new nom.nomencladorCreator({
                    listeners: {
                        "finishedCreation": self.addEnumInServer,
                        scope: self
                    },
                    enumInstance:self.enumInstance,
                    entityType:self.entityType,
                    tpl:tpl,
                    tplConfigs:self.enumInstanceConfig.tpl || {},
                })).show();
            });

        },
        getAddModRank : function(pName,pCallback,pScope){
            var self = this,
                fld = new comps.fields.fieldDenom({
                    anchor:'100%',
                    validateValue : function(v){
                        var valid = comps.fields.fieldDenom.prototype.validateValue.apply(this,arguments);

                        if(valid){
                            valid = self.indexedTreePlg.nodeQueryChilds(
                                self.selectedNode,
                                {
                                    _text_ : v,
                                    _type_ : 'category'
                                },
                                null,
                                false,
                                true,
                                true,
                                true
                            );

                            valid = valid.length == 0;

                            if(!valid)
                            {
                                this.markInvalid('La categor&iacute;a que quiere adicionar ya existe.')
                            }
                        }

                        return valid;
                    }
                }),
                fVs = pName ? {denom:pName} : null,
                wdw = new comps.Windows.AddModWindow({
                    modal:true,
                    fields: {
                        denom : fld
                    },
                    title:fVs === null?'Adicionar '+self.addRankButtonText:'Renombrar '+self.addRankButtonText,
                    fieldsValues : fVs,
                    height:130,
                    hideApplyButton : true,
                    prefix : 'categor&iacute;a',
                    layout:'fit',
                    items:[
                        {
                            layout:'form',
                            frame:true,
                            labelAlign:'top',
                            items:[fld]
                        }
                    ],
                    callback : function(pD){
                        pCallback.call(pScope || self,pD.modified.denom);
                    }
                });

            wdw.show();
        },
        addRank: function () {
            this.getAddModRank(null,function(text){

                var node = this.selectedNode,
                    self = this;
                if (!this.isARankNode(node)) {
                    node = node.parentNode;
                }

                var mask = utils.mask(this, "Adicionando "+self.addRankButtonText);

                nom.request('addRank',{
                    enumInstance: this.enumInstance,
                    newRank: node.getPath('idNode')+'/'+text
                },function (r) {
                    infoMsg('La categor&iacute;a ha sido adicionada satisfactoriamente.');
                    self.reloadTreeNode(node);
                },null,mask);

            });
        },
        modNomenclador: function (node, tpl) {
            var _enum = enums.getEnumByName(this.enumInstance,node.text),
                self = this,
                f = function(){
                    nom.request('modEnumData',{ enumId:_enum.id, enumInstance:self.enumInstance},function (response) {

                        new nom.nomencladorCreator({
                            listeners: {
                                "finishedCreation": self.modEnumInServer.createDelegate(self, [self.selectedNode], true),
                                scope: self
                            },
                            _enum: _enum,
                            refs: response['refs'],
                            enumInstance:self.enumInstance,
                            enumHasData: response['hasData'],
                            entityType:self.entityType,
                            tpl:tpl,
                            tplConfigs: self.enumInstanceConfig.tpl || {}
                        }).show();
                    });
                };
            if(this.askToChangeEnum == null)
                f();
            else
                this.askToChangeEnum(_enum,f);
        },
        modRank: function (node) {
            var self = this;
            this.getAddModRank(node.attributes._text_,function(text){
                var path = node.getPath("idNode");
                var mask = utils.mask(self, "Modificando "+self.addRankButtonText);
                nom.request('modRank',{
                    enumInstance:self.enumInstance,
                    path: path,
                    name: text
                },function (r) {

                    infoMsg('La '+self.addRankButtonText+' ha sido renombrada satisfactoriamente.');

                    self.reloadTreeNode(node);
                },null,mask);

            });
        },
        removeNomenclador: function (node) {
            var mask = Genesig.Utils.mask(this,'Eliminando '+this.entityType+': '+node.attributes._text_+'.'),
                self = this;


            AjaxPlugins.Ext3_components.Messages.MessageBox.confirm("Confirmaci&oacute;n","&iquest;Est&aacute; seguro que desea eliminar el "+this.entityType+": "+node.attributes._text_+'?',function(b){

                if (b == 'ok') {
                    nom.request('removeEnum',{
                        enumInstance:this.enumInstance,
                        enumId: enums.getEnumByName(self.enumInstance, node.text).id,
                        path: node.getPath('idNode'),
                        actions:nom.enums.getActions(this.enumInstance,'removeEnum')
                    },function (response) {

                        infoMsg('El nomenclador: ' + node.attributes._text_ + ' ha sido eliminado satisfactoriamente.');

                        enums.removeEnumByName(self.enumInstance, node.text);

                        self.reloadTreeNode(node.parentNode);
                        self.fireEvent('enumremoved',self.getEnumFromNode(node));
                    },function(error_obj){
                        if (error_obj.type === 'EnumCantBeRemovedIsRefException') {
                            AjaxPlugins.Ext3_components.Messages.MessageBox.confirm(self.entityType.substr(0,1).toUpperCase()+" referenciado", error_obj.msg + '<p>' +
                                '<br>&iquest;Desea eliminar el nomenclador y el (los) nomenclador(es) donde se encuentra referenciado?</p>', function (b) {
                                if (b == 'ok')
                                    self.deleteOnCascade(node);
                            });
                            return true;
                        }
                    },mask);
                }
                else
                    mask();
            },this);
        },
		getEnumFromNode:function(node){
            return enums.getEnumByName(this.enumInstance,node.text)
		},
        removeRank: function (node) {
            AjaxPlugins.Ext3_components.Messages.MessageBox.confirm("Confirmaci&oacute;n","&iquest;Est&aacute; seguro que quiere eliminar la "+this.addRankButtonText+" seleccionada con todas las subcategor&iacute;as y "+this.entityType+"(s) de la misma?",function(b) {
                if (b == 'ok') {
                    var path = node.getPath('idNode'),
                        self = this;
                    var mask = utils.mask(this, "Eliminando categoria.");

                    if (node.id == this.getRootNode().id) {
                        nom.request('removeAll', {enumInstance:self.enumInstance}, function (r) {
                            infoMsg('Se han borrado todos los nomencladores y categor&iacute;s satisfactoriamente');
                            self.initValues();
                        },null,mask);
                        return;
                    }

                    nom.request('removeRank', {
                        enumInstance:this.enumInstance,
                        path: path,
                        actions:nom.enums.getActions(this.enumInstance,'removeEnum')
                    }, function () {
                        infoMsg('La categor&iacute;a ha sido eliminada satisfactoriamente.');
                        self.reloadTreeNode(node.parentNode);
                    },null,mask);

                }
            },this);

        },
        addEnumInServer: function (obj) {

            var self = this;
            var _enum = obj._enum;
            var nodeParent = null;
            if (this.isARankNode(this.selectedNode))
                nodeParent = this.selectedNode;
            else
                nodeParent = this.selectedNode.parentNode;

            var _enumPath = nodeParent.getPath("idNode") + "/" + _enum.id,
                mask =this.maskObj? Genesig.Utils.mask(this.maskObj, 'An&ntilde;adiendo '+this.entityType) :null;

            nom.request('addEnum', {
                enumInstance:this.enumInstance,
                _enum: _enum,
                _enumPath: _enumPath,
                refs: obj.refs,
                actions:nom.enums.getActions(this.enumInstance,'addEnum')
            }, function () {
                enums.add(self.enumInstance, _enum);
                self.reloadTreeNode(_enum.id);

                infoMsg('El nomenclador ha sido adicionado satisfactoriamente');
            }, null, mask);
        },
        modEnumInServer: function (changes, node) {
            var mask = Genesig.Utils.mask(this, 'Modificando '+this.entityType);
            var self = this;
            nom.request('modEnum', {
                enumInstance:this.enumInstance,
                'changes': changes,
                'original': enums.getEnumByName(self.enumInstance,node.text),
                actions:nom.enums.getActions(this.enumInstance,'modEnum')
            }, function (r) {
                var _enum = changes._enum;
                enums.add(self.enumInstance, _enum);
                self.reloadTreeNode(node);

                infoMsg('Se ha modificado satisfactoriamente el nomenclador.');
                self.fireEvent('enummodified',_enum);
            }, null, mask);
        },
        deleteOnCascade:function(node){
            var self = this;
            AjaxPlugins.Ext3_components.Messages.MessageBox.confirm('Eliminar en cascada', 'Est&aacute; seguro de que quiere' +
                ' eliminar en cascada.',function(r){
                if(r == 'ok'){
                    var _enum = enums.getEnumByName(self.enumInstance, node.text);
                    var path = node.getPath('text');
                    var mask = Genesig.Utils.mask(self);
                    nom.request('delOnCascade',{
                        enumInstance:self.enumInstance,
                        _enumId:_enum.id,
                        path:path
                    },function (fp, o) {
                        self.reloadTreeNode();
                    },null,mask);
                }

            })


        }

    })
})();