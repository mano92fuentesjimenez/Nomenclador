/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var comps = AjaxPlugins.Ext3_components,
		nom = AjaxPlugins.Nomenclador,
		enums = nom.enums,
		utils = Genesig.Utils;
	nom.nomencladorTree = Ext.tree.TreePanel._createSubClass_({
		showFields :false,
		showEnums :true,
		excludeEnum :null,
		includeEnum :null,
		rootVisible :false,
		autoLoadTree :true,
		canMoveEnums :false,
		nodesEvaluator :null,
		checked:null,
        plgIndexer:null,
		enumInstance:null,
		enumInstanceConfig:null,
		constructor :function (pCfg){
			var indexer = this.indexedTreePlg = new comps.plugins.tree.indexedTree,
				plgSearch = new comps.plugins.tree.indexTreeSearch({
					indexedPlugin :indexer,
					searchOnKeyUp :true,
					confSearchField :{
						width :110
					}
				}),
				plugins = [
					plgSearch,
					new comps.plugins.tree.nodeRenderer({
						nodesProxy :this.treeNodesProxy._delegate_([], this),
                        nodesProviderProxy: function (pAttrs) {
                            return comps.treeUIProviders.ttfIconNode;
                        }
					})
				],
				tbar = [plgSearch];
			this.plgIndexer = indexer;
			this._apply_(this._default_(pCfg, {}));
			this._parent_({
				root :{
					children :[]
				},
				plugins :plugins.concat(this._default_(this.plugins, [])),
				tbar :tbar.concat(this._default_(this.tbar, [])),
				enableDD :this.canMoveEnums,
				dropConfig :{
					allowParentInsert :true
				}

			});
			this.on('nodedragover', this.nodeDragOverFunc, this);
			this.on('nodedrop', this.nodeDropFunc, this);
			this.on('beforeclick',function(nd){
                if (nd && nd.attributes._type_ === 'enum') this.fireEvent('beforeenumselected', enums.getEnumByName(this.enumInstance,nd.text));
			}, this);
            this.on('click',function(pNd){
                if (pNd && pNd.attributes._type_ === 'enum') this.fireEvent('enumselected', enums.getEnumByName(this.enumInstance,pNd.text));
            },this);
			var selM = this.getSelectionModel();
			selM.on({
				scope :this,
				selectionchange :function (pSelM, pNd){
					if (pNd && pNd.attributes._type_ === 'enum') this.fireEvent('enumselected', enums.getEnumByName(this.enumInstance,pNd.text));
				}
			});
			selM._apply_({
				getXType :function (){
					return 'selM'
				},
				isValid :function (){
					var sel = this.getSelectedNode();
					return sel && sel.attributes._type_ == 'field';
				}
			});
			this.on({
				afterrender :function (){
					if (this.autoLoadTree) this.initValues();
				}
			})
		},
		nodeDragOverFunc :function (dragObj){
			if (!this.canMoveEnums) {
				return false;
			}
			this.currentDragEventPreviousPath = dragObj.dropNode.getPath('idNode');
			if (dragObj.dropNode.attributes._type_ == 'enum') {
				return dragObj.target.getPath('text').match(/^\/\/.*?\/.*$/);
			}
			return false;
		},
		nodeDropFunc :function (dragObj){
			var point = dragObj.point;
			var previousPath = this.currentDragEventPreviousPath;
			var newPath = dragObj.dropNode.getPath('idNode');
			var targetPos = dragObj.target.getPath('idNode');

			nom.request('MoveNodeInSimpleTree',{
				enumInstance:this.enumInstance,
                point :point,
                previousPath :previousPath,
                newPath :newPath,
                targetPos :targetPos
            });
		},
		reloadTreeNode :function (pNd){
			var idNode = pNd instanceof Ext.tree.TreeNode && !pNd.isRoot ? pNd.attributes.idNode : (pNd && pNd._isString_() ? pNd : null);
			this.initValues(null, function (){
				var chld = this.indexedTreePlg.nodeQueryChilds(null, 'idNode', idNode, true, true, true, false)._first_();
				if (chld) {
					this.indexedTreePlg.nodeLocate(chld, true, true);
				}
			}, this);
		},
		initValues :function (pNd, pCallback, pScope){
			var mask = Genesig.Utils.mask(this),
				treeP = this,
				indexer = this.indexedTreePlg,
				root = treeP.root,
				args = arguments,
				self = this,
				doAppend = function (pNds){
			        pNds._each_(function(v){
                        root.appendChild(v);
                        root.expand(false, false);
                        nom.execute(pCallback,[],pScope);
                        indexer.nodeEachChild(root, function (v){
                            indexer.nodeLocate(v, false, true);
                        }, this, false);
                    });
					self.fireEvent('loadedheaders');
				};
			nom.enums.load(
				this.enumInstance,
				function (response){
					indexer.nodeRemoveAllChilds(root);
					var simpleTree = nom.enums.getSimpleTree(self.enumInstance);
					if (simpleTree) {
						if (self.rendered) {
							doAppend(simpleTree.childs);
						} else {
							self.on('afterrender', doAppend.createDelegate(self, [simpleTree.childs]));
						}
					}
				},
				function (){
					AjaxPlugins.Nomenclador.getUI(self.enumInstance).close();
				},mask,this.enumInstanceConfig
			);
		},
        treeNodesProxy:function(attr){
			var config = {
				enumInstance:this.enumInstance,
				checked:this.checked,
				excludeEnum:this.excludeEnum,
				includeEnum:this.includeEnum,
				nodesEvaluator:this.nodesEvaluator,
				showFields:this.showFields,
				showEnums:this.showEnums
			};

			return nom.treeNodesProxy(attr,config, this.enumInstanceConfig);
		}

	});
})();