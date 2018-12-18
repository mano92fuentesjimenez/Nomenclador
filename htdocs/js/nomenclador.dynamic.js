/**
 * Created by mano on 13/12/16.
 */

(function (){
    var comps = AjaxPlugins.Ext3_components,
        fields = comps.fields,
        buttons = comps.buttons,
        utils = Genesig.Utils,
        /**
         * @lends AjaxPlugins.Nomenclador
         */
        nom = AjaxPlugins.Nomenclador,
        errorMsg = comps.Messages.slideMessage.error,
        infoMsg = comps.Messages.slideMessage.info,
        wd = AjaxPlugins.Ext3_components.Windows.AddModWindow;

    /**
     * @class enums
     */
    nom.enums = function (){
        this.enums = {};
        this.defaultFields = {};
        this.loaded = {};
        this.simpleTree = {};
        this.instances ={};
        this.Events = [
            /**
             * Se lanza cuando se elimina un nomenclador que estuvo cargado
             */
            'enumdeleted',
            /**
             * Se lanza cuando el nomenclador en cuestion cambia sus propiedades.
             */
            'enumchanged'
            ];
        this.actions = {};
        this.instances = new nom.InstanceManager();
    };

    nom.enums = Ext.extend(nom.enums,
        /**
         * @lends enums
         */
    {


        loaded: null,
        simpleTree:null,
        dataSources:null,
        defaultFields:null,
        instances:null,

        /**
         * Coge el actionManager de la instancia dada.
         * @param instanceName  {string}   Nombre de la instancia de nomencladores
         * @param instanceNameModifier {string}  Nombre modificador de instancia de nomencladores
         * @returns {ActionManager}
         */
        getActionManager:function(instanceName,instanceNameModifier){
            return this.getInstance(instanceName,instanceNameModifier).getActionManager();
        },
        checkEnumInstance:function(instanceName){
            if(!this.enums[instanceName])
                throw new Error('La instancia '+instanceName+' no existe en nomencladores');

        },
        getInstance:function(instanceName,instanceModifier){
            return this.instances.getInstance(instanceName, instanceModifier);
        },
        getInstanceManager:function(){
            return this.instances;
        },
        setInstanceConfig:function(instanceName, instanceModifier, config){
            var instance = this.getInstance(instanceName, instanceModifier);
            instance.setInstanceConfig(config);
        },
        getEnumByName: function (instanceName, name){
            this.checkEnumInstance(instanceName);
            var _enum,
                enums = this.getEnums(instanceName);
            if(utils.isObject(name))
                name = name.name;

            Object.keys(enums).map(function (key){
                if (enums[key]._enum.name == name) {
                    _enum = enums[key]._enum;
                    return false;
                }
            });
            return _enum;
        },
        getEnumById: function (instanceName,id){
            this.checkEnumInstance(instanceName);
            var enums = this.getEnums(instanceName);
            if(utils.isObject(id))
                id = id.id;
            if (!enums[id])
                return false;
            return enums[id]._enum;
        },
        getObservableFromEnum: function (instanceName,_enum){
            this.checkEnumInstance(instanceName);
            return this.getEnums(instanceName)[_enum.id];
        },
        removeEnumByName: function (instanceName, name){
            this.checkEnumInstance(instanceName);
            var enums = this.getEnums(instanceName);
            Object.keys(enums).map(function (key){
                if (enums[key]._enum.name == name) {
                    enums[key].fireEvent('enumdeleted');
                    delete enums[key];
                    return false;
                }
            })
        },
        removeEnumById: function (instanceName, id){
            this.checkEnumInstance(instanceName);
            var enums = this.getEnums(instanceName);
            enums[id].fireEvent('enumdeleted');
            delete this.enums[id];
        },
        add: function (instanceName, _enum){
            this.checkEnumInstance(instanceName);
            var enums = this.getEnums(instanceName);

            if (enums[_enum.id])
                enums[_enum.id].fireEvent('enumchanged', _enum);
            else {
                enums[_enum.id] = new Ext.util.Observable();
            }
            enums[_enum.id]._enum = _enum;
        },
        load: function (instanceName, callback, onError,mask){
            var self =this;
            nom.request('getServerHeaders',{instanceName:instanceName},function (response, o){
                self.loaded[instanceName] = true;
                var enums = self.getEnums(instanceName);
                response.enums._each_(function (_enum){
                    if (enums[_enum.id] ) {
                        if(JSON.stringify(_enum) !== JSON.stringify(enums[_enum.id]._enum))
                            enums[_enum.id].fireEvent('enumchange', _enum);
                    }
                    else
                        enums[_enum.id] = new Ext.util.Observable();

                    enums[_enum.id]._enum = _enum;
                });
                enums._each_(function (_enum){
                    if (!response.enums[_enum._enum.id]) {
                        enums[_enum._enum.id].fireEvent('enumdeleted');
                        delete enums[_enum._enum.id];
                    }
                });

                self.defaultFields = response.defaultFields;
                self.simpleTree[instanceName] = response.simpleTree;
                nom.execute(callback);

            },onError,mask);
        },
        getEnums: function(instanceName){
            if(!this.enums[instanceName])
                this.enums[instanceName] = {};
            return this.enums[instanceName];
        },
        hasLoaded: function (instanceName){
            return this.loaded[instanceName];
        },
        eachEnumFieldSync: function (instanceName, enumId, pFn, scope){
            this.getEnumById(instanceName,enumId).fields._each_(function (fld, fieldId){
                if (fieldId !== nom.Type.PrimaryKey.UNIQUE_ID) {
                    return pFn.call(scope, fld, fieldId, this);
                }
            });
        },
        getSimpleTree:function(instanceName){
            this.checkEnumInstance(instanceName);
            return this.simpleTree[instanceName];
        },
        getDenomField:function(instanceName,_enum){
            if(utils.isObject(_enum))
                _enum = _enum.id;

            return this.getEnumById(instanceName,_enum).denomField;
        },
        //Devuelve los campos por defecto definidos en el servidor.
        getDefaultFields:function() {
            return this.defaultFields;
        },
        getFieldsIdFromEnum:function(_enum){
            return _enum.fields._map_(function(v, k){
                return k;
            },this, false)
        }

    });
    /**
     * @class ActionManager
     * @param actions
     */
    nom.ActionManager = function(actions){
        /**
         * actions =
         * {
         *   actionType :{
         *     when :[action, ...]
         *   }
         * }
         * actionType = [enumInstanceAdding,addEnum, removeEnum, modEnum]
         * when = [pre, post]
         * action = pluginName.Action
         */
        this.actions = utils.isObject(actions) ? actions : {};

    };
    nom.ActionManager = Ext.extend(nom.ActionManager,{

        addAction:function(when, actionType, action){

            if(action === undefined){
                action = actionType;
                actionType = when;
                when = 'pre';
            }

            if(this.actions[actionType] == null)
                this.actions[actionType] = {};
            if(!utils.isArray(this.actions[actionType][when]))
                this.actions[actionType][when] = [];

            this.actions[actionType][when].push(action);
        },
        getActions:function(actionManager){
            if(actionManager instanceof nom.ActionManager){
                var actions = new nom.ActionManager(this.actions._clone_()),
                    extActions = actionManager.getActions();
                    actions.setActions(extActions);
                return actions.getActions();
            }

            return this.actions;
        },
        setActions:function(actions) {
            if (actions)
                actions._each_(function (v, k) {
                    v._each_(function (v2, k2) {
                        this.addAction(k, k2, v);
                    },this);
                },this);
        }
    });
    nom.InstanceManager = function() {
        this.instances = {};
        this.defaultInstance = nom.export.DEFAULT_INSTANCE_MODIFIER;
        this.configs = {};
    };
    nom.InstanceManager.prototype = {
        //Configurations by instance-instanceModifiers (This is used for splitting UI features)
        instances:null,
        verifyInstance:function(instanceName, instanceModifier){

            instanceModifier = this.getInstanceNameModifier(instanceModifier);
            var id = this.getInstanceId(instanceName, instanceModifier);
            if(this.configs[id] === undefined)
                this.configs[id] = new nom.EnumInstance(instanceName,instanceModifier);
            return this.configs[id];

        },
        getInstance:function(instanceName, instanceModifier){
            return this.verifyInstance(instanceName,instanceModifier);
        },
        getInstanceNameModifier:function(instanceModifier){
            if(!utils.isString(instanceModifier))
                instanceModifier = this.defaultInstance;
            return instanceModifier;
        },
        getInstanceId:function(instanceName, instanceModifier){
            instanceModifier = this.getInstanceNameModifier(instanceModifier);
            return instanceName+'-'+instanceModifier;
        }
    };
    //Representa una instancia de nomenclador, una configuracion por cada instancia.
    nom.EnumInstance = function(name,instanceModifier){
        this.name = name;
        this.instanceModifier = instanceModifier;
        this.actionManager = new nom.ActionManager();
    };
    nom.EnumInstance.prototype = {
        //InstanceName (This is used for splitting groups of entities)
        name:null,
        instanceModifier:null,
        getActionManager:function(){
            return this.actionManager;
        },
        /**
         * Sobrescribe la configuracion para esta instancia de nomencladores.
         * @param config  {Object}  {
         *                            @see AjaxPlugins.Nomenclador.ActionManager
         *                            actions: configuration
         *
         *                            @see AjaxPlugins.Nomenclador.InstanceConfigClass
         *                            configs
         *                          }
         */
        setInstanceConfig:function(config ){
            var actions = config.actions;
            if(actions)
                delete config.actions;
            this.config = new nom.InstanceConfigClass(config);
            this.actionManager.setActions(actions);
        },
        getInstanceConfig:function() {
            if(this.config === undefined)
                this.config = new nom.InstanceConfigClass();
            return this.config;
        },
        getInstanceNameModifier:function(){
            return this.instanceModifier;
        },
        getName: function(){
            return this.name;
        },
        getInstanceId: function(){
            return enums.getInstanceManager().getInstanceId(this.name, this.instanceModifier);
        }
    };

    nom.InstanceConfigClass = function(config){
        this._apply_(config);

        this.tpl = (this.tpl || {})._map_(function(v,k){
            return new nom.Tpl(v);
        })
    };
    /**
     * @class InstanceConfigClass
     */
    nom.InstanceConfigClass = Ext.extend(nom.InstanceConfigClass, {
        getEnumDataEditor: function(tplName){
            var dataEditor = this.getValueFromTpl('enumDataEditor', tplName);
            if(utils.isObject(dataEditor))
                return dataEditor;
            return nom.GridDataEditor;
        },
        getFormDataEditor: function(tplName){
            return this.getValueFromTpl('formDataEditor',tplName);
        },
        getValueFromTpl:function(objName, tplName){
            var value = null;
            if(this[objName])
                value = this[objName];
            if(this.existTpl(tplName) && this.tpl[tplName][objName] !== undefined)
                value = this.tpl[tplName][objName];
            return value;
        },
        existTpl:function(tplName){
            return utils.isObject(this.tpl) && utils.isObject(this.tpl[tplName]);
        },
        getDefaultTplName:function(){
            return utils.isString(this.defaultTpl)? this.defaultTpl:nom.tplDefaultId;
        },
        getDefaultDataSource:function(tplName){
            return this.getValueFromTpl('defaultDataSource',tplName);
        },
        getAllTpl:function(skipDefautl){
            var self = this;
            if(!skipDefautl)
                return this.tpl;
            return this.tpl._queryBy_(function(v,k){
                return k !== self.getDefaultTplName() && k !== nom.tplDefaultId ;
            },this, true)
        },
        getTpl:function(tplName){
            var tplConfig = new nom.Tpl();
            if(this.tpl)
                tplConfig = new nom.Tpl(this.tpl[tplName],tplName);
            return tplConfig;
        },
        getTplsToShow: function () {
            return this.showTpls
        }
    });
    nom.Tpl = function(config,tplName) {
        this._apply_(config);
        if(!utils.isObject(this.extraProps))
            this.extraProps = {};
        this.tplName = tplName;
    };
    nom.tplDefaultId ='default';

    /**
     * Tpl q define como es q se va a construir el nomenclador. Solo se usa a la hora de construccion, las validaciones
     * no son contra esto. Tambien da una configuracion de como es q se va a mostrar en el arbol de nomencladores.
     *
     * readOnly:   Los nomencladores q tengan esto en su tpl, no pueden ser modificados desde nomencladores,
     *                                    Ni pueden ser creados o modificados desde nomencladores
     * hidden:     No se van a mostrar los nomencladores en el arbol de nomencladores q tengan este tpl.
     * defaultFields: Listado de campos por defectos que se deben mostrar cada vez q se cree un nomenclador
     *               Es de la forma  [field] donde cada field es de la misma forma en q se guarda
     *               en el servidor los cada campo de un nomenclador.
     * allowReferencing: Permite que aunque no se muestren los enum con este tpl, puedan ser referenciados
     *                  por los nomencladores de otros tpl q si se muestran
     * header:      Nombre a mostrar en el tpl
     * dataTypes:   Objeto de la forma { dataTypeId:true}. Si el objeto es especificado se mustran los tipos en el objeto
     *             Si el objeto no es especificado, se muestran todos los tipos.
     * divisions:   Dice en cuantas columnas se van a mostrar las propiedades extras
     * extraProps:  Objeto q contiene un listado de propiedades extras en una entidad, La llave es
     *             el identificador de la propiedad. El valor debe ser un input admisible por formValidator.
     *              Todas las propiedades extras de una entidad van a ser guardadas en un objeto extraProp en
     *             el json del nomenclador q se construyo.
     * defaultDataSource: Id del dataSource q se va a tomar por defecto.
     */
    nom.Tpl = Ext.extend(nom.Tpl,{
        isReadOnly: function(){
            return this.readOnly;
        },
        isHidden:function(){
            return this.hidden;
        },
        getHeader:function() {
            return this.header;
        },
        getExtraProps:function(){
            return this.extraProps._queryBy_(function (v,k) {
                return k !=='divisions';
            },this,true);
        },
        getExtraPropsDivisions:function () {
            return this.extraProps.divisions? this.extraProps.divisions : 2;
        },
        getDefaultFields:function() {
            var qb = function (v) {
                    return v.isDenom
                },
                config = null;
            //if tpl:default == true
            if(utils.isObject(this.defaultFields))
                config = this.defaultFields;
            else
                config = enums.getDefaultFields();

            if (config != null) {
                if (config._queryBy_(qb)._length_() === 0)
                //Si no tiene campo denominacion, le pongo uno
                //esto es porque siempre siempre, un nomenclador tiene que tener un campo denominacion
                    config['denom_rand_1254'] = enums.getDefaultFields()._queryBy_(qb)._first_();
                return config;
            }
            return this.defaultFields;
        },
        getDefaultDataSource :function(){
            return this.defaultDataSource;
        },
        getTplName: function () {
            return this.tplName;
        }
    });

    nom.refs = function (){
        this.referenced = {};
        this.addReference = {};
    };
    nom.refs = Ext.extend(nom.refs, {

        // {
        //     //idEnum+Idfield : [{enumId:"",fieldId:""}]
        // },

        load: function (instanceName, data){
            this.referenced[instanceName] = data
        },
        getRefs:function(instanceName){
            if(!this.referenced[instanceName])
                this.referenced[instanceName] = {};
            return this.referenced[instanceName];
        },
        getAddRefs:function(instanceName){
            if(!this.addReference[instanceName])
                this.addReference[instanceName] = {};
            return this.addReference[instanceName];
        },
        getReferences: function (instanceName,enumId, fieldId){
            var key = this.getKey(enumId, fieldId),
                refs = this.getRefs(instanceName);

            if (refs[key] != undefined)
                if (refs[key]._length_() > 0)
                    return refs[key];
            return false;
        },
        exists: function (instanceName,fromEnum, fromField, toEnum, toField){
            var from = this.getKey(fromEnum, fromField),
                refs = this.getRefs(instanceName),
                to = this.getKey(toEnum, toField);
            if (!refs[to])
                return false;
            return refs[to][from];
        },
        add: function (instanceName,fromEnum, fromField, toEnum, toField){
            var from = this.getKey(fromEnum, fromField),
                addRefs = this.getAddRefs(instanceName),
                to = this.getKey(toEnum, toField);

            if (!addRefs[to])
                addRefs[to] = {};
            addRefs[to][from] = 1;
        },
        clearToAdd: function (instanceName){
            this.addReference[instanceName] = {};
        },
        getAddedReferences: function (instanceName){
            var objs = [],
                addRefs = this.getAddRefs(instanceName);
            for (var to in addRefs){
                var arr = to.split(":");
                var toEnum = arr[0];
                var toField = arr[1];

                for (var j in addRefs[to]){

                    var arr2 = j.split(":");
                    objs.push({
                        fromEnum: arr2[0],
                        fromField: arr2[1],
                        toEnum: toEnum,
                        toField: toField
                    });
                }
            }
            return objs;
        },
        getKey: function (_enum, field){
            return _enum + ":" + field;
        },
        getEnum: function (reference){
            return reference.split(':')[0];
        },
        getField: function (reference){
            return reference.split(':')[1];
        }
    });

    /**
     * LLave pública usada para el encriptado de los passwords mediante el algorirmo RSA
     * @type {string}
     */
    nom.publicKey = null;

    var enums = new nom.enums();
    nom.enums = enums;

    /**
     * Funcion que retorna los datos de un nomenclador
     * @param instanceName     {string}        Identificador de la instancia de nomencladores a la cual pertenece enumId
     * @param enumId           {string}        Identificador del nomenclador delque se cargaran los datos
     * @param callback         {function}      Funcion de callback para cuando se realice la carga
     * @param [scope]          {object}        Ambito en el que se ejecutara la funcion
     * @param enumDataLoadConfig {object}      Configuración para mandar a pedir los datos.
     *                      loadEnums:boolean  Dice si se van a cargar todos los niveles de nomenclador a partir de este     *
     *                      pageSize:number    Numero maximo de registros que se enviaran
     *                      offset:number      Posicion a partir de la cual se cargaran los registros,
     *                      columns:[string]   Arreglo de field_id del nomenclador. Son las columnas que se van a mostrar.
     *                      where:string       Expresión para filtrar los datos. Solo el predicado, sin el 'where'
     *                      idRow:int          Id de la fila que se quiere recuperar.
     *                      actions:{          Indica las acciones a ejecutarse antes y despues de cargar los datos
     *                         load:{          en el servidor en un plugin. La accion es de la forma "pluginName.action"
     *                           action:{      Estas acciones se aplican solo al nomenclador q pertenece a este reader
     *                              pre:[],
     *                              post:[]
     *                           }
     *                         }
     *                      }
     * @param [onError]        {function}      Funcion que se ejecuta cuando el pedido genera errors
     * @param [mask]           {function}      Funcion que cuando se ejecuta quita la mascara
     */
    nom.getEnumData = function (instanceName, enumId, callback, scope, enumDataLoadConfig, onError, mask, _404EmptyPatch){
        function proccessRequest (response, params){
            callback.call(scope,response, params);
        }
        enumDataLoadConfig = enumDataLoadConfig || {};

        var columns = this._default_(enumDataLoadConfig.columns,[],null,null),
            cl = columns == null ? null : {};

        if(cl != null)
            columns._each_(function(v){
               cl[v]=v;
            });

        nom.request('getEnumData',{
            instanceName:instanceName,
            enum: enumId,
            enumLoadPageSize: this._default_(enumDataLoadConfig.pageSize, 100000),
            enumLoadPageOffset: this._default_(enumDataLoadConfig.offset,0),
            enumLoadEnums: this._default_(enumDataLoadConfig.loadEnums,false),
            enumLoadColumns:cl,
            enumLoadWhere:this._default_(enumDataLoadConfig.where,'',null,null),
            enumLoadIdRow:this._default_(enumDataLoadConfig.idRow,'',null,null),
            enumLoadActions:this._default_(enumDataLoadConfig.actions,{}),
            '404EmptyPatch': _404EmptyPatch
        },proccessRequest,onError,mask);
    };
    nom.getStoreConfigFromEnum = function (_enum, columns){

        columns = columns || enums.getFieldsIdFromEnum(_enum);
        var fields = [],
            cl = _enum.fields._queryBy_(function(v,k){
                return  columns.indexOf(v.id) !== -1;
            },this, true);
        for (var fieldName in cl)
            fields.push(fieldName);
        var data = [];

        var store = new Ext.data.JsonStore({fields: fields, data: data});
        store.sort(nom.Type.PrimaryKey.UNIQUE_ID, "ASC");
        return store;
    };
    nom.getColumnModelFromEnum = function (enumInstance, _enum, showHeadInfo,columns){
        var cmFields = [],
            fields = _enum.fields;
        if(columns)
            fields = fields._queryBy_(function(v, k){
                return columns.indexOf(v.id) !== -1;
            });


        fields._sort_(function(a,b){
            if(a.order === undefined || b.order === undefined)
                return false;
            return a.order>b.order;
        });
        fields._each_(function (field){
            if (field.id === nom.Type.PrimaryKey.UNIQUE_ID || field.id === nom.Type.Revision.UNIQUE_ID  ) {
                cmFields.push({header: field.header, dataIndex: field.id, hidden: true, sortable: true});
                return;
            }
            var type = nom.Type.Utils.getType(field.type);
            var header = /*showHeadInfo ?
                ('<div field_id="{fieldId}" enum_id="{enumId}" enum_instance ="{enumInstance}" onmouseenter="{handlerOver}" onmouseleave="{handlerLeave}"' +
                ' onmousemove="{handlerMove}">{header}</div>')._format_({
                    fieldId: field.id,
                    enumId: _enum.id,
                    enumInstance:enumInstance,
                    header: field.header,
                    handlerOver: "AjaxPlugins.Nomenclador.GridDataEditor.columnHeaderHandler(this, event)",
                    handlerLeave: "AjaxPlugins.Nomenclador.GridDataEditor.columnHeaderCloseHandler(this)",
                    handlerMove: "AjaxPlugins.Nomenclador.GridDataEditor.columnHeaderMoveHandler(this,event)"
                })
                :*/
                field.header;
            cmFields.push({
                header: header,
                dataIndex: field.id,
                renderer: type.gridRender,
                _fieldDetails_: field,
                _enumDetails_: _enum,
                _enumInstance_:enumInstance,
                sortable: true
            })
        });
        return new Ext.grid.ColumnModel(cmFields);
    };
    nom.getDefaultColumnId = function (instanceName, enumId){
        var _enum = enums.getEnumById(instanceName, enumId);
        return enums.getDenomField(instanceName,enumId);
    };

    //cosas de resumeView
   /* nom.getEnumStructure = function (instanceName, pEnumId, pReturnList, filterFn, scope){
        var enumDetails = enums.getEnumById(instanceName, pEnumId),
            fields = [];

        enums.eachEnumFieldSync(instanceName,pEnumId, function (pFld, pFldId){
            var isEnum = pFld.type === 'DB_Enum',
                nd = pFld._clone_();
            if (Ext.isFunction(filterFn)) {
                if (!filterFn.call(scope, pFld))
                    return;
            }

            nd.leaf = !isEnum;
            nd.text = pFld.header;
            nd._ownerEnum_ = enumDetails;
            nd.fieldId = nd.id;
            nd.id = 'nomenclador_field_'._id_();
            nd.items = isEnum ? nom.getEnumStructure(instanceName,pFld.properties._enum, true) : [];

            fields.push(nd);
        });

        if (!pReturnList) {
            fields = fields._createTree_();
            fields.getRoot().load(true);
        }

        return fields;
    };*/


    nom.getEnumDataPanel=function(instanceName, _enum, config,instanceModifier){
        var instance = enums.getInstance(instanceName,instanceModifier),
            _interface = instance.getInstanceConfig().getEnumDataEditor();

        _enum =  nom.enums.getEnumById(instanceName, _enum);

        instance.setInstanceConfig((config || {}).enumInstanceConfig);

        var panel = new Ext.Panel({
                layout: 'fit',
                items: []
            }),
            c = {
                _enum: _enum,
                enumInstance: instance,
                maskObj: panel
            },
            tab = new _interface(c._apply_(config || {}));

        panel.add(tab.getUI());
        panel.storeWriter = tab;
        panel.doLayout();

        return panel;

    };

    nom.showEnumTree = function (instanceName, showEnums, callBack, title, instanceModifier){
        var enumInstance = enums.getInstance(instanceName,instanceModifier),
            tree = new nom.nomencladorTree({
            showFields: false,
            showEnums: showEnums,
            autoLoadTree: true,
            autoScroll: true,
            enumInstance:enumInstance
        });
        tree.getSelectionModel()._apply_({
            getValue: function (){
                var node = this.getSelectedNode();
                return node ?
                {
                    id: node.attributes.idNode,
                    path: node.getPath('idNode'),
                    node: node,
                }
                    : null;
            },
            isValid: function (){
                var node = this.getSelectedNode();
                return node != null && (
                        (node.attributes._type_ === 'enum' && showEnums) ||
                        (node.attributes._type_ === 'category' && !showEnums)
                    );
            },
            getXType: function (){
                return 'cm';
            }
        });
        tree.on('dblclick', function (){
            if (showEnums && tree.getSelectionModel().getSelectedNode().attributes._type_ === 'enum' || !showEnums)
                treeWD.btnAceptar.getEl().dom.click();
        });

        var treeWD = new wd({
            width: 500,
            height: 500,
            fields: {
                tree: tree.getSelectionModel()
            },
            hideApplyButton: true,
            items: [tree],
            title: title ? title : 'Seleccionar nomenclador',
            callback: function (data){
                callBack(data.all.tree)
            }
        });

        treeWD.registrarXtypes2Validator({'cm': {evt: ['selectionchange']}});
        treeWD.show();
    };

    nom.EnumTreeTrigger =Ext.extend(fields.triggerField,{
        allowBlank:null,
        fieldLabel:null,
        readOnly:true,
        instanceName:null,
        instanceNameModifier: null,
        constructor:function(cfg){
            nom.EnumTreeTrigger.superclass.constructor.call(this,cfg)

        },
        onTrigger2Click:function(){
            var self = this;
            nom.showEnumTree(this.instanceName, true, function(obj) {
                var _enum = nom.enums.getEnumById(self.instanceName, obj.id);
                self.setValue({
                    valueField: obj.id,
                    displayField: _enum.name
                })
            },undefined,this.instanceNameModifier);
        },
        setValue:function(v){
            if(Genesig.Utils.isObject(v)) {
                this.currentValue = v;
                v = v.displayField;
            }
            else if(v ==='')
                this.currentValue = undefined;
            fields.triggerField.prototype.setValue.call(this, v);
            this.fireEvent('datachanged');
        },
        getValue:function(){
            return this.currentValue;
        },
        getXType:function(){
            return '_enumselector';
        },
        getFormVEvtNames:function(){
            return 'datachanged';
        },
        isDirty:function () {
            return !this.originalValue ? true:
                ( this.originalValue.valueField !== this.currentValue.valueField)
        }
    });


    var _refConfig = {
        _enum:null,
        enumInstance:null,
        /**
         * Columna de la cual va a coger el comboBox el valor del displayField
         */
        _fieldId:null,
        /**
         * Columnas que se van a mostrar en el selector
         * null para mostrar todas las columnas
         * [columnsId] para mostrar las columnas listadas.
         */
        selector_columns:null,
        /**
         * Dice si se muestra o no el titulo del GridDataEditor
         */
        show2ndTitle:true,
        /**
         * El titulo de la ventana del selector
         */
        selectorTitle:'Seleccionar nomenclador',
        /**
         * Especifica si se pueden elegir multiples nomencladores o uno solo.
         */
        multiSelection:true,

        currentValue:null,
        //privates
        referencedField:null,
        readOnly:true,
        filterObj:null,
        manageEnum:true,
        enumDirty:false,
        originalValue:null,
        constructor:function (config) {
            nom.enumInput.superclass.constructor.apply(this,arguments);


            this._enum = enums.getEnumById(this.enumInstance.getName(), this._enum);
            this.referencedField = this._enum.fields[this._fieldId];
            this.selector_columns = (this.selector_columns  || enums.getFieldsIdFromEnum(this._enum));

        },
        getFilterObj:function(){
            return this.filterObj;
        },
        setFilterObj:function(fieldFilter,fieldFilterValue){
            this.filterObj = { fieldFilter:fieldFilter, fieldFilterValue:fieldFilterValue};
        },
        onTrigger2Click:function() {
            var panel = new Ext.Panel({
                    layout: 'fit',
                    items: []
                }),
                config = {
                    _enum: this._enum,
                    enumInstance: this.enumInstance,
                    manageEnum:this.manageEnum,
                    showTitle:this.show2ndTitle,
                    columns:this.selector_columns,
                    multiSelection:this.multiSelection,
                    excludeEnums: this.getExclusion(),
                    maskObj:panel
                }._apply_(this.getFilterObj()),
                instanceConfig = this.enumInstance.getInstanceConfig(),
                tab = instanceConfig.getEnumDataEditor(this._enum.tpl),
                tab = new tab(config),
                self = this;

            tab.on('valueselected',function(record){
                self.setValue(self.getValueFromRecord(record));
                w.close();
            });
            tab.on('selectionChange',function(t, r){
                self.fireEvent('selectionChange',t, r )
            });
            panel.add(tab.getUI());
            panel.doLayout();

            var w = new wd({
                title: this.selectorTitle,
                width: 500,
                height: 500,
                fields: {value: tab},
                hideApplyButton: true,
                items: [panel],
                modal: true,
                constrainHeader:true,
                callback: this.addModWCallback,
                scope:this
            });

            w.show();
        },
        getExclusion:function(){
            return null;
        },
        addModWCallback:function(v){
            var record = v.all.value;
            this.setValue(this.getValueFromRecord(utils.isArray(record)? record[0]:null));
        },
        getValueFromRecord:function(record){
            var obj = {};
            obj['valueField'] = record.get(nom.Type.PrimaryKey.UNIQUE_ID);
            obj['displayField'] = record.get(this._fieldId);

            return obj;
        },
        setValue:function(value,toClean){
            var type = nom.Type.Utils.getType(this.referencedField.type),
                renderer  = type.enumTypeRenderer,
                v ='';

            toClean = !!toClean;

            if(utils.isObject(value)) { //fixing 2nd call ext does.
                v = renderer(value.displayField);
                this.currentValue = value;
                this.fireEvent('datachanged',this.currentValue);
            }
            else v = value;

            if(!toClean && this.currentValue && renderer(this.currentValue.displayField) !== v && v === ''){
                this.currentValue = null;
                this.fireEvent('datachanged',this.currentValue);
            }
            nom.enumInput.superclass.setValue.call(this,v);
        },
        clean:function(){
             this.currentValue = null;
             this.setValue('',true);
        },
        reset:function(){
            if(this.originalValue){
                this.setValue(this.originalValue);
            }
            else this.clean();
        },
        getValue:function(){
            return this.currentValue;
        },
        getXType:function(){
            return 'enum_input'
        },
        isValid:function(){
            return this.currentValue && this.currentValue['displayField'] && this.currentValue['valueField']
        },
        getFormVEvtNames:function(){
            return 'datachanged';
        },
        isDirty:function(){
            if(utils.isObject(this.originalValue)){
                return !(utils.isObject(this.currentValue)
                    && this.currentValue.valueField === this.originalValue.valueField);
            }
            return utils.isObject(this.currentValue);
        }

    };
    nom.enumInput = Ext.extend(fields.triggerField, _refConfig);
    nom.multiEnumInput = Ext.extend(Ext.grid.GridPanel,_refConfig._clone_()._apply_({

        // isGrid:true,
        constructor:function(config){
            config._enum =  enums.getEnumById(config.enumInstance.getName(), config._enum);
            var t = nom.Type.Utils.getType(config._enum.fields[config._fieldId].type),
                self =this,
                fireDChanged = function(){
                    self.fireEvent('datachanged')
                };
            this.store = new Ext.data.JsonStore({
                fields:['displayField', 'valueField'],
                data:[]
            });

            nom.multiEnumInput.superclass.constructor.call(this, (config || {})._apply_({
                height: 50,
                store: this.store,
                cm: new Ext.grid.ColumnModel([
                    {header: "Llave primaria", dataIndex:'valueField', hidden: true, sortable: true},
                    {header: config._enum.fields[config._fieldId].header, dataIndex:'displayField', renderer: t.gridRender}
                ]),
                tbar:[
                    new buttons.btnAdicionar({
                        handler: this.onTrigger2Click.createSequence(fireDChanged),
                        scope: this
                    }),
                    new buttons.btnDelete({
                        handler: this.removeSelected.createSequence(fireDChanged),
                        scope: this
                    })
                ]
            }));
        },
        getExclusion:function(){
            var exclusion = [];
            this.store.each(function(record){
                exclusion.push(record.get('valueField'));
            });
            return exclusion;
        },
        removeSelected:function(){
            var self = this;
            this.getSelectionModel().getSelections()._each_(function(v, k){
                self.store.remove(v);
            })
        },
        addModWCallback:function(v){
            var self = this;
            v.all.value._each_(function(v, k){
                self.store.add(new self.store.recordType(self.getValueFromRecord(v)))
            });
        },
        setValue:function(value){
            if(utils.isArray(value)){
                var self =this;
                this.store.removeAll();
                value._each_(function(v,k){
                    if(v.valueField !== null)
                        self.store.add(new self.store.recordType(v));
                })
            }
        },
        getValue:function(){
            var data = [];
            this.store.each(function(record){
                data.push(record.data);
            });
            return data;
        },
        isValid:function(){
            var value = this.getValue();
            return this.allowBlank ? true : value._length_() >0;
        },
        isDirty: function(){
            var value = this.getValue();
            if(utils.isObject(this.originalValue)){
                if(utils.isObject((value))){
                    var values = value._map_(function(v){
                        return v.valueField;
                    },false);
                    var everyEqual = true;
                    this.originalValue._each_(function(v){
                        everyEqual &=  values.indexOf(v.valueField) !== -1;
                    });
                    return !everyEqual;
                }
            }
            return true;

        }
    }));




    var enumSelector = Ext.extend(nom.enumInput,{
        modifying:false,
        filterBy:null,
        manageEnum:false,
        //overwriting
        show2ndTitle:false,
        title:undefined,
        selector_columns:null,

        constructor:function(){
            this._apply_(arguments[0]);
            enumSelector.superclass.constructor.call(this,{});

            if(this.filterBy !== undefined && this.filterBy instanceof enumSelector && this.filterBy._enum.id){
                nom.makeFilter(this.enumInstance,this, this.filterBy, !!this.modifying);
                this.filterBy.setValue(this.filterBy.modifying);
            }
            if(this.modifying){
                this.setValue(this.modifying);
            }
        }
    });
    /**
     * Aplica filtrado por valores a los campos de un nomenclador
     * @param currentField  {AjaxPlugins.Nomenclador.enumInput}
     * @param dependsField  {AjaxPlugins.Nomenclador.enumInput}
     * @param modifing      {bool}        True para no inicializar los fields que dependen de otros en disable
     */
    nom.makeFilter = function (instanceName, currentField, dependsField, modifing){

        var filter = nom.canBeFilteredBy(instanceName, currentField._enum, dependsField._enum );

        if (!modifing)
            currentField.disable();

        var f = function (v, currentField, filter){
            if (!v) {
                return;
            }
            if(currentField.rendered) {
                currentField.onTrigger1Click();
            }
            currentField.setDisabled(false);
            currentField.setFilterObj( filter,dependsField.getValue()['valueField']);
            currentField.needReload = true;
        };
        f = f.createDelegate(this, [currentField, filter], true);
        dependsField.on('datachanged', f);

        var oldTrigger1 = dependsField.onTrigger1Click;
        dependsField.onTrigger1Click = function (oldTrigger1){
            this.fireEvent('reset');
            oldTrigger1.apply(this);
        }.createDelegate(dependsField, [oldTrigger1], 0);

        var oldReset = currentField.reset;
        currentField.reset = function (oldReset){
            this.setDisabled(true);
            oldReset.apply(this, arguments);
            this.onTrigger1Click();
            this.fireEvent('reset');
        }.createDelegate(currentField, [oldReset], true);

        dependsField.on('reset', function (c){
            c.reset();
        }.createDelegate(dependsField, [currentField], 0));
    };

    /**
     * Funcion que modifica el arbol de nomencladores segun la configuracion.
     * @param pAtrs
     * @param config {object}  Es un objeto de configuracion o el string diciendo la instancia de nomencladores.
     * @param config.excludeEnum  {object | string}  Contiene los nomencladores q se van a excluir, si es un objeto es de la forma {idEnum:true}
     * @oaram config.includeEnum  {obectj} Es un nomenclador y si esta presente, solo se va a mostrar este mas todas las categorias
     * @oaram config.enumInstance {AjaxPlugins.Nomenclador.InstanceConfigClass} Es la instancia de nomencladores. Es obligatorio
     * @param config.showFields   {bool}  Si es true, se van a mostrar los campos de los nomencladores.
     * @param config.showEnums    {bool}  Dice si se muestran los nomencladores o no.
     * @param config.checked      {array[string]}  Si este arreglo existe, muestra checkboxes en los nodos de los nomencladores
     *                            Y esta checked si el identificador del nomenclador esta en el arreglo
     *     nodesEvaluator {function}  Funcion q dice si un nodo va a formar parte del arbol o no
     *     allowReferencing  {bool}   Dice si este renderizador fue llamado por el tipo enum para hacer refenrencias entre
     *                         nomencladores.
     * @returns {*}
     */
    nom.treeNodesProxy = function (pAtrs, config){
        //Si config no es un objeto o string, entonces q de error.
        var enumInstance = config.enumInstance,
            instanceConfig = enumInstance.getInstanceConfig(),
            toExclude = config.excludeEnum,
            toInclude = config.includeEnum,
            typ = pAtrs._type_ || ('childs' in pAtrs ? 'category' : 'enum'),
            isEnum = typ == 'enum',
            isCat = typ == 'category',
            children = null,
            checked = undefined,
            text = typ == 'field' || typ == 'category' ? pAtrs.text : enums.getEnumById(enumInstance.getName(), pAtrs.idNode).name,
            enumFields = config.showFields && isEnum ? (
                enums.getEnumById(enumInstance.getName(), pAtrs.idNode).fields._queryBy_(function (pV){
                    return pV.id !== nom.Type.PrimaryKey.UNIQUE_ID
                        && pV.id !== nom.Type.Revision.UNIQUE_ID
                        && (nom.Type.Utils.getType(pV.type).valueType !== nom.Type.REF_Type);
                }, this, true)
            ) : [];
        if(isCat) {
            children = this._default_(pAtrs.childs, [])._queryBy_(function (pV, pK) {
                var _enum = nom.enums.getEnumById(enumInstance.getName(), pV.idNode),
                    tplName = _enum.tpl,
                    tplConfig = instanceConfig.getTpl(tplName),
                    showTpls = instanceConfig.getTplsToShow();

                return 'childs' in pV || (
                    (!toExclude || (utils.isObject(toExclude) ? !(pV.idNode in toExclude) : pV.idNode !== toExclude))
                    && (!tplConfig.isHidden() || (tplConfig.allowReferencing && config.allowReferencing))
                    && (!utils.isArray(showTpls) ||  showTpls.indexOf(tplConfig.getTplName()) !== -1)
                    && (!toInclude || toInclude.id === pV.idNode)
                    && (config.showEnums && !('childs' in pV))
                );
            }, this, true)._map_(function (pV, pK) {
                var isCat = 'childs' in pV;
                return {}._apply_(pV, {
                    _type_: isCat ? 'category' : 'enum',
                    allowChildren: isCat,
                    text: pV.text
                })
            }, this, false);
        }
        else if(isEnum && config.showFields){
            children = enumFields._map_(function (pV, pK){
                // esta linea clona la configuracion de enum, ademas de ponerle algunos valores
                return ({})._apply_(pV,{
                    text :pV.header,
                    _type_ :'field',
                    field :true,
                    iconCls :"enum_tree_field_icon",
                    leaf :true,
                    idNode:pV.id,
                    _enumId:pV._enumId
                });
            }, this, false)
        }
        checked = (utils.isArray(config.checked) && typ ==='enum') ? config.checked.indexOf(pAtrs.idNode) !== -1: undefined;
        checked = checked || (config.checked===true ? (typ ==='enum'? false:undefined):undefined);

        delete pAtrs.id;
        pAtrs._apply_({
            idNode :pAtrs.idNode,
            _type_ :typ,
            children :children && (function (){})._same_(config.nodesEvaluator) ? children._queryBy_(config.nodesEvaluator) : children,
            text :text,
            category :pAtrs.childs,
            iconCls : (isEnum ? 'enum_tree_node gisTtfIcon_webdev-seo-form' : 'enumCategoryTreeIcon'),
            leaf :children === null || children._length_() === 0,
            _text_ :text,
            allowChildren :pAtrs.childs != null,
            checked: checked,
            tpl: enums.getEnumById(enumInstance.getName(),pAtrs.idNode).tpl
        });
        return pAtrs;
    };

    nom.getEnumSelectorClass = function(instanceName,enumId, columnId, manageEnum, filterBy,value, visualConfigs, instanceModifier ){
        var _enum = nom.enums.getEnumById(instanceName,enumId),
            instance = nom.enums.getInstance(instanceName, instanceModifier),
            columnId = columnId || nom.getDefaultColumnId(instanceName,enumId),
            columns = [columnId],
            selector_columns = visualConfigs ? visualConfigs.selector_columns: undefined,
            selectorTitle = visualConfigs ? visualConfigs.selectorTitle: undefined,
            show2ndTitle = visualConfigs ? visualConfigs.show2ndTitle: undefined;

        _enum = _enum ? _enum:nom.enums.getEnumByName(instanceName,enumId);

        if(selector_columns === 'all')
            columns = null;
        else if(utils.isObject(selector_columns))
            columns = selector_columns._map_(function(v, k){
                return k;
            },this, false);

        return Ext.extend(enumSelector,{
            _fieldId: columnId,
            _enum:_enum,
            _field:_enum.fields[columnId],
            selectorTitle: selectorTitle,
            show2ndTitle:show2ndTitle,
            selector_columns:columns,
            modifying:value,
            filterBy:filterBy,
            enumInstance:instance,
            manageEnum:manageEnum
        });
    };

    /**
     * Dice si un nomenclador puede ser filtrado por otro y devuelve el campo por el que lo puede hacer.
     * @param _enum  {object|string}    Enum que se va a filtrar.
     * @param byEnum {object|string}    Enum por el que se quiere filtrar.
     */
    nom.canBeFilteredBy = function (instanceName, _enum, byEnum){
        _enum = _enum._isString_() ? enums.getEnumById(instanceName,_enum) : _enum;
        byEnum = byEnum._isString_() ? enums.getEnumById(instanceName,byEnum) : byEnum;

        var fieldToFilterBy = null;

        _enum.fields._each_(function (value, key){
            if (value.type == 'DB_Enum') {
                if (value.properties._enum == byEnum.id) {
                    fieldToFilterBy = key;
                    return null;
                }
            }
        });
        return fieldToFilterBy;
    };

   /**
     * Muestra la ventana principal de nomencladores de la instancia enumInstance usando la configuracion config.
     * @param instanceName  {string}    Nombre de la instancia de nomencladores. Nuevo nombre crea una instancia nueva.
     * @param config    {object}        Configuracion con la cual se va a ejecutar esta instancia de nomencladores.
     * @param config.formDataEditor {object}  - Debe contener el prototipo de la clase que se va a usar como formulario
     *                                        a la hora de insertar datos. Debe heredar de FormDataEditor.
     * @param config.enumDataEditor {object} Debe contener el prototipo de la clase que se va a usar como interfaz para
     *                                      visualizar los datos. Debe heredar de EnumStoreWriter si esta interfaz va a
     *                                      poder escribir datos o de EnumStoreReader si solo va a leer datos.
     * @param config.defaultTpl {string} - Identificador del tpl que va a mostrar por defecto.
     * @param config.defaultDataSource {string} - Si es especificado este dataSource, este es el q se usa para crear todos los
     *                                            nomencladores de esta instancia.
     * @param config.tpl {object}  - Objeto con configuracion por tpl.Si el nombre de un tpl es default, entonces ese es el tpl q se le aplica a todos los nomencladores en esta
     *                               instancia de nomencladores.
     *
     * @param config.tpl.tplConfio {object} - Configuracion de Tpl {@link AjaxPlugins.Nomenclador.Tpl}
     *
     * @param config.actions {object} Actions  {@link AjaxPlugins.Nomenclador.ActionManager}
     * @param config.showTpls {string[]}  Arreglo de identificadores de tpl q se van a mostarar en esta vista. Por defecto se muestran todos.
     * @param instanceModifier  {string}  Modificador al nombre de instancia. El nombre de instancia agrupa entidades, el modificador
     *                                    agrupa configuraciones de UI.

     *
     */
    nom.showUI = function (instanceName, config, instanceModifier){
        nom.getUI(instanceName, config,instanceModifier).show();
    };
    nom.getUI = function(instanceName, config, instanceModifier){
        instanceName = instanceName ? instanceName : nom.export.DEFAULT_INSTANCE;
        if(instanceModifier === undefined && !utils.isObject(config)){
            instanceModifier = config;
            config = null;
        }
        var instance = enums.getInstance(instanceName,instanceModifier),
            instanceId = instance.getInstanceId();

        if(utils.isObject(config))
            instance.setInstanceConfig(config);


        if(!nom.UIDict[instanceId]) {
            nom.UIDict[instanceId] = new nom.nomencladorEditor({
                enumInstance: instance,
                listeners: {
                    close: function () {
                        AjaxPlugins.Nomenclador.removeUI(instanceId);
                    }
                }
            });
            AjaxPlugins.Location.registerWindows(nom.UIDict[instanceId]);
        }
        return nom.UIDict[instanceId];
    };
    nom.eachUI = function(callBack){
        nom.UIDict._each_(callBack);
    };
    nom.removeUI = function(instanceName){
        nom.UIDict[instanceName] = null;
    };
    nom.UIDict = {};

    nom.execute = function(f,params, scope){
        if((function () {})._same_(f))
            return f.apply(scope || this,params);
        return null;
    };
    nom.request = function (action, params, onSuccess, onError, mask, trigger) {

        var f = function (r, o) {
            var response = '';
            try {
                nom.execute(mask);
                response = r.responseText ? Ext.decode(r.responseText) : r.variables;
                // response = response.result;
            }
                //Esto solo ocurre cuando php se rompe. Ya que el objeto de respuesta, siempre viene codificado
                //por el framework.
            catch (throwed) {
                errorMsg(throwed);
                Logger.error(r.responseText);
                nom.execute(onError);
                return;
            }
            if (response && response.error) {
                if(nom.execute(onError, [response.error.type]) == null)
                    errorMsg("Ha ocurrido un error.", response.error.msg);
                Logger.error(response.error.msg);
                return;
            }

            nom.execute(onSuccess,[response.result, params]);
        };
        if(params == null)
            params = {};
        params['action'] =action;

        if(params.instanceName) {
            if(params.instanceName instanceof nom.EnumInstance) {

                var actions =params.instanceName.getActionManager().getActions();
                params.instanceName = params.instanceName.getName();

                if(params['actions'])
                    params['actions']._apply_(actions);
                else
                    params['actions'] = actions;
            }
        }

        var p = {params:Ext.encode( params)};
        var failure = function (o) {
            if (mask)
                mask();
            errorMsg(o.statusText);
        };
        if (trigger){
            if(!(action in nom.Actions)){
                nom.Actions[action] = {
                    buildPostRequest : function (argObject) {
                        return AjaxHandler.buildPostRequest() + "&action=Nomenclador." + action + "&params=" + encodeURIComponent(p.params);
                    },
                    //.....................................................................
                    onAfterAjaxCall: function (argObject, pluginOutput) {
                        if(Genesig.Utils.isFunction(argObject.success)){
                            argObject.success(pluginOutput);
                        }
                    },
                    onError : function(argObject,pluginOutput){
                        if(Genesig.Utils.isFunction(argObject.failure)){
                            argObject.failure(pluginOutput);
                        }
                    }
                };
            }
            Genesig.ajax.trigger('Nomenclador.' + action, {triggerParams: p, success: f,failure:failure}, mask);
        }
        else
            Ext.Ajax.request({
                url: Genesig.ajax.getLightURL("Nomenclador") + '&action=' + action,
                params: p,
                success: f,
                failure: failure,
                scope: this

            });

    };

})();