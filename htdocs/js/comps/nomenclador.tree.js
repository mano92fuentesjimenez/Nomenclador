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
						nodesProxy :this.wrapNodeAttributes._delegate_([], this),
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
					root.appendChild(pNds);
					root.expand(false, false);
					this._default_(pCallback, function (){
					}).call(pScope || this);
					indexer.nodeEachChild(root, function (pNd){
						indexer.nodeLocate(pNd, false, true);
					}, this, false);
					self.fireEvent('loadedheaders');
				};
			nom.enums.load(
				this.enumInstance,
				function (response){
					indexer.nodeRemoveAllChilds(root);
					var simpleTree = nom.enums.getSimpleTree(self.enumInstance);
					if (simpleTree) {
						if (self.rendered) {
							doAppend(simpleTree.childs._map_(function (pV){
								return pV;
							}, self, false));
						} else {
							self.on('afterrender', doAppend.createDelegate(self, [simpleTree.childs._map_(function (pV){
								return pV;
							}, self, false)]));
						}
					}
				},
				function (){
					AjaxPlugins.Nomenclador.getUI(self.enumInstance).close();
				},mask,this.enumInstanceConfig
			);
		},
		wrapNodeAttributes :function (pAtrs){
			var self = this,
				toExclude = self.excludeEnum,
				toInclude = self.includeEnum,
				typ = pAtrs._type_ || ('childs' in pAtrs ? 'category' : 'enum'),
				isEnum = typ == 'enum',
				enumFields = this.showFields && isEnum ? (
					enums.getEnumById(this.enumInstance, pAtrs.idNode).fields._queryBy_(function (pV){
						return pV.id != nom.Type.PrimaryKey.UNIQUE_ID && (nom.Type.Utils.getType(pV.type).valueType !== nom.Type.REF_Type);
					}, this, true)
				) : [],
				children = typ == 'category'
					? this._default_(pAtrs.childs, {})._queryBy_(function (pV, pK){
					return 'childs' in pV || (
							(!toExclude || ( utils.isObject(toExclude) ? !(pK in toExclude): pK != toExclude))
							&& (!toInclude || toInclude.id == pK)
							&& (self.showEnums && !('childs' in pV))
						);
				}, this, true)._map_(function (pV, pK){
					var isCat = 'childs' in pV;
					return {}._apply_(pV, {
						_type_ :isCat ? 'category' : 'enum',
						allowChildren :isCat,
						text :pV.text
					})
				}, this, false)
					: (
					isEnum
						? enumFields._map_(function (pV, pK){
						return {}._apply_(pV, {
							text :pV.header,
							_type_ :'field',
							field :true,
							iconCls :"enum_tree_field_icon",
							leaf :true,
							idNode:pV.id,
							_enumId:pV._enumId
						});
					}, this, false)
						: []
				),
				text = typ == 'field' || typ == 'category' ? pAtrs.text : enums.getEnumById(self.enumInstance, pAtrs.idNode).name,
				checked = (utils.isArray(this.checked) && typ ==='enum') ? this.checked.indexOf(pAtrs.idNode) !== -1: undefined,
				checked = checked || (this.checked===true ? (typ ==='enum'? false:undefined):undefined);


			delete pAtrs.id;
			pAtrs._apply_({
				idNode :pAtrs.idNode,
				_type_ :typ,
				children :children && (function (){
				})._same_(this.nodesEvaluator) ? children._queryBy_(this.nodesEvaluator) : children,
				text :text,
				category :pAtrs.childs,
				//iconCls :'',//'iconCls' in pAtrs ? pAtrs.iconCls : (pAtrs.childs ? "enum_tree_category_icon" : "enum_tree_node_icon"),
                iconCls : (isEnum ? 'gisTtfIcon_webdev-seo-form' : 'enumCategoryTreeIcon'),//pAtrs.childs ? '' : "enum_tree_node",
				leaf :children.length === 0,
				_text_ :text,
				allowChildren :pAtrs.childs != null,
				checked: checked
			});
			return pAtrs;
		}
	});
})();