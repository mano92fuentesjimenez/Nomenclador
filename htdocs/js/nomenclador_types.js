/**
 * Created by mano on 15/12/16.
 */
(function() {
    var nom = AjaxPlugins.Nomenclador,
        buttons = AjaxPlugins.Ext3_components.buttons,
        comps = AjaxPlugins.Ext3_components,
        fields = comps.fields,
        errorMsg = comps.Messages.slideMessage.error;

    /**
     * @type {*|Function}
     */
    nom.Type = Ext.extend(function(){
        this.valueType = this._default_(this.valueType,nom.Type.VALUE_Type);
    },{

        nameToShow : '',
        /**
         * Es un input de ext. Debe tener un getValue para obtener el valor.
         * @type {Ext.form}
         */
        getValueEditExtComp : function(enumInstance, field, _enum, enumInstanceConfig){
            /*
             OVERWRITE THIS
             */
        },
        /**
         * Booleano que dice si property tiene que se mostrado obligatoriamente.
         */
        propertyNeeded: true,
        /**
         * Booleano que dice si la ventana se debe destruir para crear nuevamente.
         */
        destroyProp:false,
        /**
         * Es una funcion tiene por parametros el fieldId y enumId al cual se le cambian las prop y que retorna,
         *   una ventana que debe tener closeAction:'hide'. Un metodo getValue.
         *                                                   Un metodo setValue que recibe el mismo tipo de
         *                                                   objeto que getValue retorna, el campo al que
         *                                                   aplica propiedades y el nomenclador donde esta.
         *                                                  Debe lanzar 'propertynotsetted' cuando no se asigna valor
         * @type {null}
         */
        getPropertiesExtComp : null,/*function(){
         /!*
         OVERWRITE THIS
         *!/
         },*/
        /**
         * Si el tipo es REF_Type, el valor devuelto por getPropertiesExtComp debe ser
         *          {_enum: nombre_enum, field:nombre_field}
         *    el tipo devuelto por getValueEditExtComp debe ser
         *          {displayField: valor referenciado, valueField: verdadero valor}
         * Si el tipo devuelto es VALUE_Type, el valor devuelto por getPropertiesExtComp, es
         * un objeto que el tipo implementado entiende.
         *    el valor devuelto por getValueEditExtComp es un string.
         * @type {string}
         */
        valueType : null,
        isGrid:false,
        /**
         * Renderer del grid
         * @param text
         * @returns {*}
         */
        gridRender : function(text){
            if(this._fieldDetails_ && this._fieldDetails_.type == 'DB_Enum')
                return text.displayField;
            return text;
        },
        /**
         * Funcion que retorna valor de una celda en forma de string dado un determinado valor
         * @param pValue
         * @returns {string}
         */
        getCellTextValue : function(pValue){
            return pValue === undefined || pValue === null ? '' : pValue;
        },
        /**
         * Funcion que debe comparar 2 objetos devueltos por get propertiesExtComp
         * @type {function}
         */
        compareProperties : function(obj1, obj2){return true;},
        /**
         * Especifica que este campo depende de otros campos.
         */
        dependsOnOthersFields:false,
        /**
         * Funcion que se llama si un campo depende de otros, puesto que los campos del que depende pueden cambiar.
         */
        validate:function(enumInstance, fields, propValue, field){
            /**
             * OVERWRITE THIS
             */
        },
        /**
         * Funcion que se llama para comprobar que esta columna depende de otra en especifico.
         * @param field
         * @param propValue
         */
        dependsOn:function(field,propValue){
            /**
             * OVERWRITE THIS.
             */
        },
        /**
         * Funcion que se llama a la hora de seleccionar un tipo para saber si se puede seleccionar el tipo dado
         * los campos que ya se crearon
         * @param fields
         */
        canBeSelected:function(enumInstance, fields){
            return true;
        },
        /**
         * Render que se usa en el selector de filas en el tipo nomenclador.
         * @param value
         * @returns {*}
         */
        enumTypeRenderer:function(value){
            return value.toString();
        },
        /**
         * Si un tipo tiene una propiedad que necesita ser evaluada en el servidor para ver si es valida,
         * tiene que implementar este metodo y devolver true.
         * Si la propiedad es true, se invocara en el servidor el metodo validateProp del tipo correspondiente.
         * La propiedad va a estar en $param['prop']
         * Se supone que esta propiedad se evalue en tiempo de creacion del nomenclador, y por tanto no se encuentra
         * el nomenclador que posee esta propiedad.
         * @returns {boolean}
         */
        propNeedValidationOnServer:function(){
            return false;
        },
        /**
         * Funcion que se usa para ver si un tipo es Lazy, es decir si los valores de este tipo se calculan
         * cuando el cliente los pide dado el costo de calcularlos.
         * El gridRender de este campo debe devolver un div con una clase nomenclador_asyncLoad que indica que se va a cargar.
         *
         */
        isLazy:function(field){
            return false;
        },
        asynLoad:function(enumInstance,pEl,field,callback){
            if(!pEl.getAttribute('asyncDone')){
                this.loadFunc(enumInstance,pEl,callback,field);
            }
            pEl.setAttribute('asyncDone',true);

        },
        /**
         * Si isLazy es true, esta funcion es la que se encarga de cargar los datos.
         * @param pEl
         */
        loadFunc:function(enumInstance,pEl,callback,field){callback()},
        /**
         * Dice si el tipo y por tanto la columna se debe mostrar en el reporte.
         * @returns {boolean}
         */
        showInReport:function (){
            return true;
        },
        getColumnTypeHeader:function(enumInstance, field){
            return ('<tr><td>Tipo</td><td>{type}</td></tr>')._format_({
                type:this.nameToShow,
                needed:field.needed?'si':'no'
            });
        },
        canBeFiltered:false,
        canBeMultiple:false


    });

    nom.Type.Utils = {
        getType:function(type){
            return typesDict[type];
        },
        getTypesDict:function(){return typesDict;},
        addType:function(typeId,type){
            nom.Type.Types[typeId] = type;
            typesDict[typeId] =  new type();
        }

    };

    nom.Type.ValueType = Ext.extend(nom.Type,{
        constructor:function(){
            nom.Type.ValueType.superclass.constructor.apply(this,arguments);
        },
        getDefaultConfig : function(field){
            return {
                fieldLabel : field.header,
                anchor:'100%'
            };
        }
    });

    nom.Type.FileType = Ext.extend(nom.Type,{
        header: "",
        url: "",
        constructor:function(){
            nom.Type.FileType.superclass.constructor.apply(this,arguments);
        }
    });

    nom.Type.PrimaryKey ={
        UNIQUE_ID :"id_enum_1100",
        type:"PrimaryKey"
    };
    nom.Type.REF_VALUE_ID = "_32enum_REF_ID4792";
    nom.Type.REF_Type = "ref";
    nom.Type.VALUE_Type = "value";

    //espacio de nombre donde van todos los types.
    nom.Type.Types = {};

    //Son los tipos que dependen de otros campos en el nomenclador para tener valor.
    nom.Type.Formula = Ext.extend(nom.Type.ValueType, {
        constructor: function (){
            nom.Type.Formula.superclass.constructor.apply(this, arguments);
        },
        //Como este componente depende de los demas, se le pasa un objeto con todos los campos creados.
        getPropertiesExtComp: function (enumInstance,_enumId, fieldId, fields){
        },
        destroyProp:true,
        dependsOnOthersFields:true,
        getColumnTypeHeader:function(enumInstance, field){
            var _enum = nom.enums.getEnumById(enumInstance, field._enumId);
            var fields= _enum.fields;
            var v = field.properties.raw.replace(/<(.*?)>/g, function (match, p1){
                return fields[p1].header;
            });
            return ('<tr><td>Tipo</td><td>{type}</td></tr>' +
            '<t><td>F&oacute;rmula</td><td>{formula}</td></t>')._format_({
                type:this.nameToShow,
                needed:field.needed?'si':'no',
                capa:field.properties,
                formula:v
            });
        }
    });

    nom.Nomenclador = function(cfg){

        this.fields = cfg.fields || [];
    };
    nom.Nomenclador = Ext.apply(nom.Nomenclador, {
        getSimpleTree: function (node) {

            var self = this;
            var e = { childs:{}, idNode:node.text};
            node.childNodes.map(function (child) {
                e.childs[child.text]=self.getSimpleTree(child);
            });
            return e;
        },
        /**
         * Construye el arbol de TreeNode a partir de un arbol especificado en simpleTree.
         * @param simpleTree    {object}    Arbol en donde idNode es el identificador de un Enum
         *                                  childs son los hijos que tiene cada nodo.
         *                                  category dice si es de tipo categoria, en caso contrario es un
         *                                  nomenclador.
         * @param enums         {[]}        contiene el arreglo de la especificacion de cada enum creado.
         * @param toExclude     {enum}      es un nomenclador a excluir en la creacion del arbol.
         * @returns {Ext.tree.TreeNode | undefined }
         */
        getNodes: function (simpleTree,enums, toExclude) {

            return simpleTree.childs._queryBy_(function(pV,pK){
                return !toExclude || (pK != toExclude.id);
            },this,true)._map_(function(pV,pK){
                var isCat = 'childs' in pV;

                return {}._apply_(pV,{
                    _type_ :  isCat ? 'category' : 'enum',
                    text: pK
                })
            },this,false);//
        }
    });

    var typesDict ={};
    var typesInstance =[];

})();