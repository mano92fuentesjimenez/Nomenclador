(function() {
    var comps = AjaxPlugins.Ext3_components,
        utils = Genesig.Utils,
        nom = AjaxPlugins.Nomenclador,
        enums = nom.enums,
        types = nom.Type,
        toolbars = comps.toolbars,
        addW = AjaxPlugins.Ext3_components.Windows.AddModWindow,
        _enumButtons = {
            goToFirstPage:'goToFirstPage',
            goToPreviousPage:'goToPreviousPage',
            goToNextPage:'goToNextPage',
            goToLastPage:'goToLastPage',
            refresh:'refresh',
            destroy:'destroy'
        };



    nom.interfaces = {};

    nom.interfaces.readerBtns = _enumButtons;
    nom.interfaces.EnumStoreReader = Ext.extend(Ext.util.Observable, {

        //needed
        _enum: null,
        enumInstance:null,

        //config
        //-filters
        '404EmptyPatch': true,
        fieldFilter: null,
        fieldFilterValue: null,
        filterByRecordId: null,

        //----------------------
        pageSize: 10,
        pagePosition: 0,
        extraParams: null,
        maskObj:null,
        /**
         * {bool | string}
         */
        showTitle:true,
        columns:null,
        multiSelection:true,

        lazyInit:false,
        offlineMode:false,
        initValues:null,
        appendData: false,

        //privates
        excludeEnums:null,
        store: null,
        totalCount: null,
        submitButton: null,

        searchByDenomValue:null,
        hasLoadedBoolean: null,
        enumUI:null,
        storeInitialized:false,
        initialized:false,

        /**
         * Objeto de la forma
         * { fieldId:v, fieldValue:vv}
         */
        groupBy:null,

        //Cada nomenclador puede tener acciones en especifico q se pueden llevar en el servidor.
        actionManager:null,
        constructor: function (config){
            this._apply_(config);
            var self = this;

            this.initializeConfig();
            this.addEvents({
                /**
                 * Event that is called when the store is initialized.
                 */
                'storeinitialized':true,
                /**
                 * Event that is called when the data from this _enum has been loaded.
                 */
                'finishedloadingenum':true,
                /**
                 * Evento que se lanza cuando se selecciona un elemento en modo solo lectura. En este componente se usa
                 * para poder seleccionar un nomenclador con dobleclick en modo solo lectura puesto que en el modo escritura
                 * dobleclick se usa para modificar los valores.
                 */
                'valueselected':true
            });

            nom.interfaces.EnumStoreReader.superclass.constructor.call(this, config);
            if(utils.isString(this._enum))
                this._enum = enums.getEnumById(this.enumInstance.getName(), this._enum);

            this.initializeEnumEvents();
            this.columns = this.columns || nom.enums.getFieldsIdFromEnum(this._enum);
            if(this.columns.indexOf(nom.Type.PrimaryKey.UNIQUE_ID)=== -1)
                this.columns.push(nom.Type.PrimaryKey.UNIQUE_ID);
            if(this.fieldFilter)
                this.columns.remove(this.fieldFilter);

            this.showTitle = utils.isString(this.showTitle) ? this.showTitle : ( this.showTitle === false ? undefined: this._enum.name);
            this.initializeButtons();
            this.setTitle(this.showTitle);
            this.store = this.createStore();
            self.enumUI = self.initializeUI(this.columns, this.multiSelection);
            this.initializeEvents();

            setTimeout(function() {
                if (!self.lazyInit)
                    self.init()
            },0);

            if(this.lazyInit && this.initValues && utils.isArray(this.initValues))
                this.store.loadData(this.initValues);

            this.actionManager = new nom.ActionManager();
        },
        initializeConfig:function(){
            var self = this,
                buttons = {
                    goToFirstPage: { handler:function () {
                        self.firstPage();
                    }},
                    goToPreviousPage: {
                        handler: function () {
                            self.previousPage();
                        }
                    },
                    goToNextPage: {
                        handler: function () {
                            self.nextPage();
                        }
                    },
                    goToLastPage:{handler:function () {
                        self.lastPage();
                    }},
                    destroy:{
                        handler : function () {
                            self.destroy();
                        }
                    },
                    refresh:{
                        tooltip: "Actualizar datos",
                        iconCls: "gis_actualizar",
                        text: '',
                        handler:function () {
                            self.reloadCurrentPage
                        }
                    }
                },
                events = {
                    /**
                     * onSelectionChange( record[])
                     */
                    selectionChange:this.onSelectionChange,
                    /**
                     * recorddblclick( record)
                     */
                    recorddblclick:this.recorddblclick,
                    destroy:this.onUIdestroyed
                };
            this.__buttonsConfig = (this.__buttonsConfig || {})._apply_(buttons);
            this.__eventsConfig = (this.__eventsConfig || {})._apply_(events);
        },
        onUIdestroyed:function(){
            this.fireEvent('destroy');
        },
        getMaskObj:function(msg){
            var maskObj = this.maskObj ? this.maskObj : this.getUI(),
                msg = msg || 'Cargando nomenclador';
            if(maskObj)
                return Genesig.Utils.mask(maskObj, msg);

        },
        setMaskObjObjective:function(panel){
            this.maskObj = panel;
        },
        initializeEnumEvents:function(){

            if(this.offlineMode)
                return;

            var _enum = this._enum,
                self = this,enum_obs,
                funcEnumChange = function (){
                    self.reconfigure(self);
                },
                funcEnumDeleted = function () {
                    self.destroy();
                };

            if (Ext.isString(_enum))
                this._enum = enums.getEnumById(this.enumInstance.getName(), _enum);

            enum_obs = enums.getObservableFromEnum(this.enumInstance.getName(), _enum);
            enum_obs.on('enumchanged', funcEnumChange,self);
            enum_obs.on('enumdeleted', funcEnumDeleted,self);
            this.title = _enum.name;

            this.on('destroy', function () {
                enum_obs.un('enumchanged', funcEnumChange, self);
                enum_obs.un('enumdeleted', funcEnumDeleted, self);
            }, this);
        },
        recorddblclick:function(record){
            this.fireEvent('valueselected',record);
        },
        searchByDenom: function(value){
            var self = this;

            this.searchByDenomValue = value;
            this.resetCount(function (r) {
                self.loadEnumData(0);
            })
        },
        resetSearchByDenom: function(){
            this.searchByDenom(undefined);
        },
        resetCount:function(cb){
            var self = this;
            nom.request('getTotalRecordsFromEnum', {
                instanceName: this.enumInstance,
                _enum: this._enum.id,
                where: this.getEnumLoadConfig(0).where,
                actions:this.getActions(this),
                extraParams: this.extraParams
            }, function (r) {
                self.totalCount = r;
                $$.execute(cb);
            },null ,this.getMaskObj());
        },
        init: function () {
            var self = this,
                cb = function () {
					self.store = self.createStore();
					self.setNewStore(self.store);
					self.loadEnumData(self.pagePosition, function () {
                        self.checkButtonsDisability();
						self.pagePosition = 0;
						self.storeInitialized = true;
						self.fireEvent('storeinitialized', self);
					});
                    self.initialized = true;
				};
			if(!this.offlineMode)
			    this.resetCount(cb);

			else setTimeout(cb,0);

        },
        getEnumLoadConfig: function (pagePosition) {
            var where = null,
                _enumStr = this._enum.id.toString(),
                primary = _enumStr +'.'+types.PrimaryKey.UNIQUE_ID+'',
                pageSize = this.pageSize,
                offset = (pagePosition * this.pageSize),
                c = this.store.getCount(),
                currentPageElemCount = (this.pagePosition + 1) * pageSize;

            if (this.fieldFilter)
                where = _enumStr+'.' + this.fieldFilter + ' = ' + this.fieldFilterValue + ' ';
            else if(this.filterByRecordId)
                where = _enumStr+'.' + nom.Type.PrimaryKey.UNIQUE_ID + ' = ' + this.filterByRecordId;
            if(utils.isArray(this.excludeEnums) && this.excludeEnums._length_() > 0 ){
                if(!utils.isString(where))
                    where = '';
                where += primary +' not in '+ Ext.encode(this.excludeEnums).replace('[','(').replace(']',')').replace(/"/g,'');
            }
            if(utils.isString(this.searchByDenomValue)){
                if(!utils.isString(where))
                    where = ' true ';
                where += ' and base.' + nom.enums.getDenomField(this.instance.getName(), this._enum.id)+" like '%"+this.searchByDenomValue+"%'";
            }
            if(this.appendData && c!==0 && (currentPageElemCount - c) > 0){

                this.pagePosition-=1 ;
                pageSize = currentPageElemCount - c;
                offset = c;
            }

            var params = {
                where: where,
                pageSize: pageSize,
                offset: offset,
                columns: this.columns,
                actions: this.getActions(this),
                '404EmptyPatch': this['404EmptyPatch']
            };
            if(utils.isObject(this.extraParams))
                params.extraParams = this.extraParams;
            return params;
        },
        setPageSize:function(pageSize){
            if(!this.initialized || this.pageSize === pageSize){
                this.pageSize = pageSize;
                return;
            }
            var previousPageCount = this.getTotalPages();
            this.pageSize = pageSize;
            var currentPageCount = this.getTotalPages();

            this.pagePosition = Math.floor((currentPageCount* (this.pagePosition+1))/previousPageCount  );
        },
        getTotalPages:function(){
            return Math.ceil(this.totalCount / this.pageSize);
        },
        getPagingBar:function(){
            var self = this;
            var pb =  new toolbars.PagingBar({
                loadProxy:function (page,cb) {
                    self.pagePosition = page-1;
                    self.loadEnumData(page -1, cb);
                },
                pageSize:this.pageSize,
                currentPage:this.pagePosition,
                totalElems:this.totalCount,
                listeners: {
                    pagesizechanged: function (tb, value) {
                        self.pageSize = value;
                    }
                }
            });

            this.on('storeinitialized', function() {
                self.store.on('add', function (store, records) {
                    var length = records.length;
                    pb.increaseTotalElems(length);
                });
                self.store.on('remove', function () {
                    pb.increaseTotalElems(-1);
                });
                pb.increaseTotalElems(parseInt(self.totalCount));
            });
            return pb;
        },
        /**
         * Carga los datos del nomenclador subyacente usando config
         * @param pagePosition {int}  Posicion de la pagina a cargar
         * @param cb {function}       Funcion que se llama en cuanto termina la carga
         */
        loadEnumData: function (pagePosition, cb) {
            var self = this;
            this.fireEvent('beforedataload',this);
            if(!this.offlineMode) {
                this.setDisableButtons(true,true);
                nom.getEnumData(
                    this.enumInstance.getName(),
                    this.enumInstance.getInstanceNameModifier(),
                    this._enum.id,
                    function (response, params) {
                        self.handleLoadedData(response, params, cb);
                    },
                    this, this.getEnumLoadConfig(pagePosition), function () {
                        self.onLoadError()
                    }, this.getMaskObj(),
                    self['404EmptyPatch']
                )
            }
            else setTimeout(function(){
                self.handleLoadedData(self.store.data || [],[],cb)
            },0)


        },
        handleLoadedData : function(response, params,cb){
            this.restoreButtonsDisableStatus();
            this.store.loadData(response, !!this.appendData);
            this.hasLoadedBoolean = true;
            this.fireEvent("finishedloadingenum", this, this._enum, params);
            nom.execute(cb,[],this);
            this.refreshView();
        },
        beyondLastPage(page){
            return (page) * this.pageSize > this.totalCount;
        },
        isLastPage:function(){
            return this.beyondLastPage(this.pagePosition+1);
        },
        isFirstPage:function() {
            return (this.pagePosition === 0);
        },
        nextPage: function () {
            var self = this;
            if (this.isLastPage()) {
                Logger.error('Se esta llamando a avanzar pagina en la ultima pagina');
                return;
            }
            this.loadEnumData(this.pagePosition + 1, function(){
                self.pagePosition += 1;
                self.checkButtonsDisability();
            });
        },
        checkButtonsDisability: function(){

            this.setDisableButton(_enumButtons.goToNextPage, this.isLastPage());
            this.setDisableButton(_enumButtons.goToLastPage,this.isLastPage());
            this.setDisableButton(_enumButtons.goToPreviousPage, this.isFirstPage());
            this.setDisableButton(_enumButtons.goToFirstPage, this.isFirstPage());
        },
        previousPage: function () {
            var self = this;
            if (this.isFirstPage()) {
                Logger.error('Se esta llamando a retroceder la pagina en la primera pagina');
                return;
            }
            this.loadEnumData(this.pagePosition - 1,function(){
                self.pagePosition -=1;
                this.checkButtonsDisability();
            });
        },
        setDisableButton:function(idButton, disabled){
            var button = this.getButtonInstance(idButton);
            if(utils.isObject(button)) {
                button._disabled_ = disabled;
                $$.execute(button.setDisabled,[button,disabled],this);
            }
        },
        setDisableButtons:function(disabled,loading){
            var self = this;
            _enumButtons._each_(function (v,k) {
                var button = self.getButtonInstance(k);
                if(loading && utils.isObject(button))
                    button._previousState_ = button._disabled_;
                self.setDisableButton(k,disabled);
            })
        },
        restoreButtonsDisableStatus: function(){
            var self = this;
            _enumButtons._each_(function (v,k) {
                var button = self.getButtonInstance(k);
                if(utils.isObject(button) && button._previousState_ !== undefined){
                    self.setDisableButton(k,button._previousState_);
                    delete button._previousState_;
                }
            })
        },

        lastPage: function () {
            var self = this;
            var page = this.totalCount % this.pageSize === 0 ? Math.floor(this.totalCount / this.pageSize) - 1 :
                Math.floor(this.totalCount / this.pageSize);
            this.loadEnumData(page,function(){
                self.pagePosition = page;
                self.checkButtonsDisability();
            });
        },
        reloadCurrentPage: function () {
            this.loadEnumData(this.pagePosition);
        },
        firstPage: function () {
            var self = this;
            this.loadEnumData(0, function(){
                self.pagePosition = 0;
                self.checkButtonsDisability();
            });
        },
        goToPage: function(page){
            if(!(page < 0 || this.beyondLastPage(page)))
            {
                var self = this;
                this.loadEnumData(page,function(){
                    self.pagePosition = page;
                })
            }
            Logger.error('La pagina esta fuera del rango de pagina');
        },
        createStore: function () {
            return nom.getStoreConfigFromEnum(this._enum, this.columns);
        },

        getSelection: function () {
            return this.selections;
        },
        getXType: function () {
            return 'enum_store';
        },
        isValid:function(){
            return this.selections && this.selections.length > 0 && this.selections[0].state ===undefined;
        },
        getValue: function () {
            return this.selections /*!= null ? (this.multiSelection ? this.selections : this.selections[0] ): null*/;
        },
        setValue: function (value) {
            var key = nom.Type.PrimaryKey.UNIQUE_ID,
                self = this,
                f = function(){
                    var record = this.store.find(key,value);
                    self.selectRecord(record);
                };
            if(!this.hasLoaded())
                this.on('finishedloadingenum',f);
            else f();
        },
        getFormVEvtNames:function(){
            return 'selectionchange';
        },
        onSelectionChange: function (records) {
            this.selections = records;
            this.fireEvent('selectionchange',this, records);
        },
        destroy:function(){
            this.fireEvent('destroy');
            this.destroyUI();
        },

        initializeEvents:function() {
            this.__eventsConfig._each_(function (f, k) {
                var fnNm = 'add' + k + 'Event';
                if (!(fnNm in this)) {
                    Logger.warn('Evento no implementado: ' + k);
                }
                else
                    this[fnNm](f,this);

            }, this);

        },
        initializeButtons:function(){
            this._enumViewButtons = {};
            this.__buttonsConfig._each_(function(config, k){
                this._enumViewButtons[k] = this.initializeButton(config,k);
            }, this);
        },
        getButtonInstance:function(idButton){
            return this._enumViewButtons[idButton];
        },
        getButtonInstances:function(pArray){
            return this._enumViewButtons._map_(function (v) {
                return v;
            },this,!pArray);
        },
        getUI:function(){
            return this.enumUI;
        },
        reconfigure: function (){
            this.init();
        },

        addAction:function(which, when, action){
            this.actionManager.addAction(when,which,action);
        },
        getActions: function(){
            return this.actionManager.getActions(this.enumInstance.getActionManager())
        },

        //Filtering methods
        /**
         * Funcion para filtrar elementos
         * @param ids {array}       Arreglo de identificadores a excluir
         */
        excludeRows:function (ids) {
            if(utils.isArray(ids) && ids._length_() > 0)
                this.excludeEnums = ids;
            else
                this.excludeEnums = null;

            this.reloadCurrentPage()
        },

        /**
         * TO BE OVERRIDED
         */
        /**
         * Inicializa la UI mostrando solo las columnas columns y el tipo de seleccion.
         */
        initializeUI:function(columns, multiSelection){
            Logger.error('Funcion initializeUI no fue sobrescrita');
        },
        /**
         *
         * @param store
         */
        setNewStore:function(store){
            Logger.warn('La funcion setNewStore no fue sobrescrita');
        },
        destroyUI: function (){
            Logger.warn('Funcion destroyUI no fue sobrescrita');
        },
        onLoadError: function(){
            this.destroyUI();
            return null;
        },
        initializeButton: function(config, button_id){
            Logger.warn('Funcion initializeButton no fue sobrescrita');
        },
        setTitle:function(title){
            Logger.warn('Funcion setTitle no fue sobrescrita');
        },
        refreshView :function(){
            Logger.warn('Funcion refreshView no fue sobrescrita');
        }
    });

    
})();