/**
 * Created by mano on 11/01/17.
 */

(function(){

    var nom = AjaxPlugins.Nomenclador;
    nom.dbType = function(){
        this.type = "";
        /**
         * Retorna el panel que se va a usar en el editor dataBaseSelector.
         * @returns {*} {Ext.Panel}     Retorna un panel que debe tener un metodo GetValue, en el cual se retorne el
         *                              objeto de configuracion de la base de datos.
         *                              Debe lanzar el evento change cada vez que cambia.
         *                              Debe tener un metodo isValid()
         */
        this.getConfigPanel = function(enumInstance){return new Ext.Panel()};
    };
    /**
     * Aqui se encuentrar todos los tipos de definidos que implementan dbType y por tanto se usan para definir
     * una fuente de datos nueva
     * @type {dbType[]}
     */
    nom.dbType.Types = {};

    nom.dbType.Utils={
        /**
         * Devuelve una instancia general del objeto con nombre de tip typeName. Dos llamadas al metodo con el
         * mismo parametro devuelve la misma instancia.
         * @param typeName {string}   nombre del tipo del cual se va a retornar la nueva instancia.
         * @returns {*}     Uno de los tipos definidos en @link nomenclador.dbType.Utils
         */
        getDbType:function(typeName){
            return dbTypes[typeName];
        },
        /**
         * Funcion que devuelve un diccionario donde las llaves son los nombres de los tipos definidos en Type
         * y los valores son instancias de dichos tipos
         * @returns {{}}
         */
        getDbTypesDict:function(){
            return dbTypes;
        }
    };

    var types = nom.dbType.Types;

    types.Postgree_9_1= Ext.extend(nom.dbType, {
        type: "Postgree_9_1",
        constructor: function () {
        },
        getConfigPanel: function (enumInstance) {
            return new dbPanel({
                dataSource: types.Postgree_9_1.prototype.type,
                enumInstance:enumInstance
            });
        }
    });
    types.MySQL_5_5 = Ext.extend(nom.dbType,{
        type:"MySQL_5_5",
        constructor:function() {
        },
        getConfigPanel : function(enumInstance) {
            return new dbPanel({
                dataSource: types.MySQL_5_5.prototype.type,
                enumInstance:enumInstance
            })
        }
    });

    var dbTypes= {};
    for(var type in nom.dbType.Types)
    {
        dbTypes[type] = new nom.dbType.Types[type]();
    }

    var dbPanel = Ext.extend(Ext.Panel,{

        dbName:null,
        host:null,
        user:null,
        password:null,
        port:null,
        dataSource:null,
        layout:"form",
        testSourceButton:null,
        frame:true,

        constructor:function(){
            this.createInputs();

            this.items = [
                this.host,
                this.port,
                this.user,
                this.password,
                this.testSourceButton,
                this.dbName,
                this.schemaSelector
            ];

            dbPanel.superclass.constructor.apply(this,arguments);
            this.addEvents({"change":true});
        },
        createInputs:function(){

            this.dbNameStore = new Ext.data.JsonStore({
                fields:["name"],
                data:[]
            });
            this.dbName = new Ext.form.ComboBox({
                mode:'local',
                disabled:true,
                displayField:"name",
                triggerAction:"all",
                fieldLabel:"Nombre de la BD",
                allowBlank:false,
                store:this.dbNameStore,
                enableKeyEvents:true
            });
            this.dbName.on("select", this.dbNameChange, this);
            this.dbName.on("keyup", this.dbNameChange, this);

            this.schemasStore = new Ext.data.JsonStore({
                fields:["schema"],
                url:Genesig.ajax.getLightURL("Nomenclador.default") + "&action=getDbSchemas",
                baseParams:{enumInstance:this.enumInstance}
            });
            this.schemasStore.on("load", function(t, records){
                this.schemaSelector.setValue(records[0].get("schema"));
                this.valid = true;
                this.fireEvent("change");
            },this);


            this.host = new Ext.form.TextField({
                llowBlank:false,
                fieldLabel:"Ruta de la BD"
            });
            this.user = new Ext.form.TextField({
                allowBlank:false,
                fieldLabel:"Nombre de usuario"
            });
            this.password = new AjaxPlugins.Ext3_components.fields.fieldPasswd({
                fieldLabel:"Password"
            });
            this.port = new Ext.form.NumberField({
                allowBlank:false,
                minLength:1,
                maxLength:Math.pow(2,32),
                fieldLabel:"Puerto",
                value:'5432'
            });
            this.testSourceButton = new Ext.Button({
                text:"Probar Coneccion",
                handler:this.testConn,
                disabled:true,
                scope:this
            });
            this.schemaSelector = new Ext.form.ComboBox({
                mode:"local",
                disabled:true,
                fieldLabel:"Esquema",
                displayField:"schema",
                store:this.schemasStore,
                allowBlank:false,
                lazyInit:false,
                triggerAction:"all",

            });

            this.schemaSelector.on("keyup", function(){
                this.valid = this.schemaSelector.isValid() && this.dbName.isValid();
                this.fireEvent("change");
            },this);

            var validator = new Genesig.Componentes.FormValidator({
                fields:[this.host, this.user, this.password, this.port],
                buttons:[this.testSourceButton]
            });
            validator.EVT_MANAGER.on("valid", this.onValidatorChange,this);
            validator.EVT_MANAGER.on("invalid", this.onValidatorChange,this);

            // var validator2 = new AjaxPlugins.Ext3_components.FormValidator({
            //     fields:[this.host, this.user, this.password, this.port, this.dbName]
            // })

        },
        onValidatorChange: function() {
            this.dbName.disable();
            this.schemaSelector.disable();
            this.valid = false;
            this.fireEvent("change");
        },
        dbNameChange: function (t) {
            this.schemaSelector.enable();
            if(this.dbNameStore.find("name", t.getValue()) !=-1)
                this.schemasStore.load({params:{conn: this.getValue()}});
            this.valid = this.dbName.isValid() && this.schemaSelector.isValid();
            this.fireEvent('change');
        },
        testConn:function(){
            var self =this;
            nom.request('getDataBasesNames',{
                enumInstance:this.enumInstance,
                user:this.user.getValue(),
                password:this.password.getValue(),
                port:this.port.getValue(),
                host:this.host.getValue(),
                dataSource:this.dataSource
            },function(response,o) {
                self.dbName.store.loadData(response, false);
                self.dbName.enable();
            });
        },
        getValue:function(){
            return {
                dbname:this.dbName.getValue(),
                user:this.user.getValue(),
                password:this.password.getValue(),
                port:this.port.getValue(),
                dataSource:this.dataSource,
                host:this.host.getValue(),
                schema:this.schemaSelector.getValue()
            }
        },
        isValid:function () {
            return this.valid;
        }
        
        
    })


})();