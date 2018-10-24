/**
 * Created by Mano on 08/05/2017.
 */
(function(){

	var nom = AjaxPlugins.Nomenclador;

	nom.export = {};
	var exp = nom.export,
		utils = Genesig.Utils,
		connError = function()    {
			throw new Error('Error de comunciacion con el servidor al cargar el plugin nomenclador.');
		};

	exp._defineConstant_('DEFAULT_INSTANCE','system');

	/**
	 * Toda funcion de este objeto debe comprobar que los scripts de nomenclador ya esten cargados, asi como los headers
	 * de los nomencladores. Es por eso que se crea este wrapper para que cada vez que se llame una de estas funciones, se
	 * realicen estas operaciones.
	 *
	 * @param serviceName {string}     Nombre de la función que se va a incorporar a export.
	 * @param fn   {function}          Función que se incorpora a export.
	 *                              Esta función decoradora anhade un último parametro a la función a ejecutar.Como toda
	 *                              función se ejecuta asíncronamente, es decir, para ejecutarse dependen de que se cargue
	 *                              los archivos y extras de nomenclador, los resultados van a venir en el último parámetro
	 *                              de la función ejecutada, el cual va a ser un función de callback que tiene en el primer
	 *                              parámetro el resultado.
	 */
	function addService(serviceName,fn, notUseLastAsCallback){
		exp[serviceName] = function (){
			var args = arguments,
				f = function(){
					if((function(){})._same_(args[args.length-1]) && !notUseLastAsCallback) {
					    var argumts = [];
					    for(var i = 0; i< args.length-1;i++ ){
					        argumts.push(args[i]);
                        }
                        args[args.length - 1](fn.apply(this, argumts));
                    }
					else fn.apply(this, args)
				};

			_require_('nomenclador').then(function(){
                if( (args.length ===1 && utils.isFunction(args[0])) || nom.enums.hasLoaded(args[0]))
                    f();
                else nom.enums.load(args[0], f);
            })

			// nom.loadDynamicJs(
			// 	function(){
			// 		if(!nom.enums.hasLoaded())
			// 			nom.getEnumHeaders(f);
			// 		else f();
			// 	},
			// 	this,
			// 	connError,
			// 	true);
		};
	}

    /**
	 * @param instanceName {string}    Nombre de la instancia de nomencladores. Para agrupar las entidades
	 * @param instanceModifier {string}Modificador del nombre de instancia. Para agrupar las configuraciones
     */
    exp.showManager = function(instanceName,instanceModifier){};
	addService('showManager',function () {
        nom.getUI.apply(nom,arguments).show();
    });

	/**
	 * Muestra una ventana con la estructura de todos los nomencladores junto con sus categorias.
	 * @param instanceName string	    Nombre de la instancia de nomencladores, Para agrupar las entidades.
	 * @param callback {function}       Función que se llama cuando se selecciona un enum en la ventana.La función recibe
	 *                                 como parámetro un objeto con las siguientes propiedades.
	 *                                  id:ID del enum seleccionado.
	 *                                  path:Camino hasta el enum según los id de las categorias y el enum en el árbol.
	 *                                  node:Nodo del enum en el árbol.
	 * @param title {string}            Titulo de la ventana
	 * @param instanceModifier {string} Modificador del nombre de instancia. Se usa para dividir las configuraciones de
	 * 						           UI
	 */
	exp.showEnumTree = function(instanceName, callback, title, instanceModifier){};
	addService('showEnumTree',function(instanceName, callback, title, instanceModifier){
		nom.showEnumTree(instanceName, true, callback, title || 'Listado de nomencladores', instanceModifier);
	}, true);
	
	/**
	 * Devuelve un panel en el que se muestran los datos de un nomenclador.
     * @param instanceName string	    Nombre de la instancia de nomencladores
	 * @param _enum {object|string}     Objeto enum o string con el id de un enum. Es el enum a editar los datos.
	 * @param config {object}          Configuración a aplicar al panel que se va a devolver.
	 * 				   instanceNameConfig:{object}  Como mismo se define en nom.showUI()
	 * 				   manageEnum:boolean   Define si se va a permitir administrar los datos del nom.
	 * @param instanceModifier {string}  @see ShowEnums
	 */
	exp.getEnumDataPanel=function(instanceName, _enum, config, instanceModifier){};
	addService('getEnumDataPanel',function(instanceName, _enum, config, instanceModifier){
		return nom.getEnumDataPanel.apply(arguments);
	});
	
	/**
	 * Devuelve un panel en que se muestra la estructura de todos los enums con las categorias.
	 * @param instanceName string	    Nombre de la instancia de nomencladores
	 * @param config    {object}        Objeto de configuración a aplicar al panel que se devuelve.
	 *                             showFields:bool para mostrar los campos de un nomenclador.
	 *                             showEnums:bool para mostrar los nomencladores en caso de que solo se quiera mostar
	 *                             el árbol de categoría.
	 * @param instanceModifier {string}  @see ShoEnums
	 * @returns {*}
	 */
	exp.getEnumTreePanel=function(instanceName, config, instanceModifier){};
	addService('getEnumTreePanel', function(instanceName, config, instanceModifier){
		var instance = nom.enums.getInstance(instanceName, instanceModifier);
		return new nom.nomencladorTree( ({canMoveEnums:false, enumInstance:instance})._apply_(config));
	});

	/**
	 * Devuelve un arreglo de objetos de la forma {name: nomebreDelNomenclador, id: IdentificadorDelNomenclador}
	 */
	exp.getEnumsList=function(instanceName){};
	addService('getEnumsList',function (instanceName){
		return nom.enums.getEnums(instanceName)._map_(function(val,id){
			return {name:val._enum.name, id:val._enum.id};
		});
	});

	/**
	 *
	 */
	exp.enumExist=function(instanceName,pEnumId){};
	addService('enumExist',function (instanceName,pEnumId){
		return !!nom.enums.getEnumById(instanceName,pEnumId)

	});

	/**
	 * Devuelve JSON con la estructura del arbol de nomencladores
	 * El método es asíncrono, debe pedir los datos del servidor por lo que el resultado se le pasa por párametro a la
	 * función callback.
	 */
	exp.getEnumTreeStructure=function(instanceName,callback){};
	addService('getEnumTreeStructure',function (instanceName,callback){
		nom.request('getServerHeaders',{instanceName:instanceName},function (response, o) {
           callback(buildTree(instanceName,response.simpleTree));
        });
	},true);
	var buildTree = function(instanceName,simpleTree){
		if(!simpleTree.childs){
			return {
				text: nom.enums.getEnumById(instanceName,simpleTree.idNode).name,
				leaf:true,
				nodeId:simpleTree.idNode
			}
		}
		else {
			var childs = [];
			simpleTree.childs._each_(function(value, key){
				childs.push(buildTree(instanceName,value));
			});
			return {
				text:simpleTree.text,
				leaf:false,
				nodeId:simpleTree.idNode,
				childrens:childs
			}
		}
	};

	/**
	 * Devuelve un objeto enum seleccionado por el identificador de este
     * @param instanceName string	    Nombre de la instancia de nomencladores
	 * @param enumId {string}           Identificador del enum
	 */
	exp.getEnumById=function(instanceName,enumId){};
	addService('getEnumById',function (instanceName,enumId){
		return nom.enums.getEnumById(instanceName,enumId);
	});
/**
	 * Devuelve un objeto enum seleccionado por el identificador de este de forma sincrona, va a dar error si no
 	 * esta cargada la instancia
     * @param instanceName string	    Nombre de la instancia de nomencladores
	 * @param enumId {string}           Identificador del enum
	 */
	exp.getEnumByIdSync=function(instanceName,enumId){
		return nom.enums.getEnumById(instanceName,enumId);
	};


	/**
	 * Devuelve un enum seleccionado por el nombre que tiene este
     * @param instanceName string	    Nombre de la instancia de nomencladores
	 * @param enumName  {string}        Nombre del enum seleccionado.
	 */
	exp.getEnumByName=function(instanceName,enumName){};
	addService('getEnumByName', function(instanceName,enumName){
		return nom.enums.getEnumByName(instanceName,enumName);
	});

	/**
	 * Devuelve un enum seleccionado por el nombre que tiene este de forma sincrona, va a dar error si no esta cargado la instancia
     * @param instanceName string	    Nombre de la instancia de nomencladores
	 * @param enumName  {string}        Nombre del enum seleccionado.
	 */
	exp.getEnumByNameSync=function(instanceName,enumName){
		return nom.enums.getEnumByName(instanceName,enumName);
	};
	/**
	 * Extrae los datos del nomenclador segun la configuración.
     * @param instanceName string	    Nombre de la instancia de nomencladores
	 * @param _enum {object | string}   Enum o id del enum al que se le quieren extraer los datos
	 * @param config {object}       	Objeto de configuracion para cargar los datos. Ver Nomenclador.dynamic.getEnumData
	 * @param callback {function}       Función que se llama cuando se terminan de cargar los datos del nomenclador.
	 *                                  Recibe por parametros un arreglo de records con los datos de la forma
	 *                                  [ { fieldId: data ,...} ].
	 * @param scope                     Scope en el que se va a a llamar a la función callback.
	 */
	exp.getEnumAllData=function(instanceName,_enum, config,callback, scope, onError, mask){};
	addService('getEnumAllData', function(instanceName,_enum, config,callback, scope, onError, mask){
		var configObj = config._isObject_() ? config : {};
			_enum = _enum._isString_() ? _enum : _enum.id;
		nom.getEnumData(instanceName, _enum, callback, scope, configObj, onError, mask)
	},true);

	/**
	 * Extrae los datos de la columna especificada en el nomenclador especificado.
     * @param instanceName string	    Nombre de la instancia de nomencladores
	 * @param enumId {string}           Id del enum
	 *
	 *  @param config {object}           En el objeto config todas las propiedades son opcionales, sus propiedades son:
	 *                             offset: A partir de que elemento se van a extrar los datos.
	 *                             limit: Cuantos datos se van a extraer.
	 *  @param columnId {string|null}    Id de la columna a coger los datos. Si la columna es null, entonces se extraen
	 *                                 los datos de la columna por defecto.
	 *  @param callback {function}       Functión que se llama cuando se terminan de cargar los datos.
	 *                                   los datos cargados serán de la forma [{primaryKeyId: idRow, idColumn:value}...]
	 */
	exp.getEnumColumnData=function(instanceName,enumId, config, columnId, callback){};
	addService('getEnumColumnData',function (instanceName,enumId, config, columnId, callback){
		nom.request('getEnumColumnData',{
			instanceName:instanceName,
            enumId:enumId,
            config:config,
            columnId:columnId
        },callback)
	},true);


	/**
	 * Devuelve un comboBox en el cual se pueden seleccionar los datos de la columna del nomenclador especificado.
     * @param  instanceName string	    Nombre de la instancia de nomencladores
	 * @param  enumId {string}             Id del nomencldor.
	 * @param  columnId{string|null}       Id de la columna de la cual se quiere ver los datos. Si la columna es null, entonces
	 *                                  se cogen los datos de la columna por defecto.
	 * @param  manageEnum {bool}             Dice si se va a mostrar o no el toolbar de anhadir y modificar nomenclador.
	 * @param  filterBy{AjaxPlugins.Nomenclador.enumInput}
	 *                                      Instancia devuelta por este método de tal forma que este campo va a ser filtrado
	 *                                   por los datos de tal instancia.
	 * @param value {object}               Valor del selector cuando se estan modificando valores, este es de la forma
	 *        @member displayField {string}: valor que se muestra
	 *        @member valueField{string}: valor real del selector.
     * @param visualConfigs {object}	Objeto con las configuraciones de la interfaz visual.*
     *                 -selector_columns {undefined|string|object}  Dice que columnas son las que se muestran en el selector
     * 						   undefined       Para solo mostrar la columna especificada por columnId
     * 						   string   ='all' Para mostrar todas las columnas del nomenclador
     * 						   [fieldId]  Para mostrar todas las columnas listadas en el arreglo
     * 				   -show2ndTitle {boolean=false} Dice si se va a mostrar o no el 2do titulo, que es el nombre del nomenclador
     * 				   -selectorTitle        {string}  Titulo de la ventana de selector de nomenclador.
	 */
	exp.getEnumSelector=function(instanceName, enumId, columnId, manageEnum, filterBy,value,visualConfigs ){};
	addService('getEnumSelector',function (instanceName,enumId, columnId, manageEnum, filterBy, value,visualConfigs ){
		return new (nom.getEnumSelectorClass.apply(this,arguments));
	});

	/**
	 * Devuelve la clase de un comboBox en el cual se pueden seleccionar los datos de la columna del nomenclador especificado.
     * @param  instanceName string	    Nombre de la instancia de nomencladores
	 * @param  enumId {string}             Id del nomencldor.
	 * @param  columnId{string|null}       Id de la columna de la cual se quiere ver los datos. Si la columna es null, entonces
	 *                                   se cogen los datos de la columna por defecto.
	 * @param  manageEnum {bool}             Dice si se va a mostrar o no el toolbar de anhadir y modificar nomenclador.
	 * @param  filterBy{AjaxPlugins.Nomenclador.enumInput}
	 *                                      Instancia devuelta por este método de tal forma que este campo va a ser filtrado
	 *                                   por los datos de tal instancia.
	 * @param value {object}               Valor del selector cuando se estan modificando valores, este es de la forma
	 *        @member displayField {string}: valor que se muestra
	 *        @member valueField{string}: valor real del selector.
     * @param visualConfigs {object}	Objeto con las configuraciones de la interfaz visual.*
	 *                 -selectorColumns {undefined|string|object}  Dice que columnas son las que se muestran en el selector
     * 						   undefined       Para solo mostrar la columna especificada por columnId
     * 						   string   ='all' Para mostrar todas las columnas del nomenclador
     * 						   [fieldId]  Para mostrar todas las columnas listadas en el arreglo
	 * 				   -show2ndTitle {boolean=false} Dice si se va a mostrar o no el 2do titulo, que es el nombre del nomenclador
	 * 				   -selectorTitle        {string}  Titulo de la ventana de selector de nomenclador.
	 */
	exp.getEnumSelectorClass=function(instanceName, enumId, columnId, manageEnum, filterBy,value,visualConfigs ){};
	addService('getEnumSelectorClass',function (instanceName, enumId, columnId, manageEnum, filterBy, value,visualConfigs ){
		return nom.getEnumSelectorClass.apply(this, arguments);
	});

	exp.getStoreReaderPrototype = function(instanceName){};
	addService('getStoreReaderPrototype', function(instanceName){
		return nom.interfaces.EnumStoreReader;
	});

    exp.getStoreWriterPrototype = function(instanceName){};
    addService('getStoreWriterPrototype', function(instanceName){
        return nom.interfaces.EnumStoreWriter;
    });
	exp.getEnumTreePanelPrototype = function(instanceName){};
	addService('getEnumTreePanelPrototype', function(instanceName){
		return nom.nomencladorTree;
	});
	exp.getEnumGridDataEditorPrototype = function(instanceName){};
	addService('getEnumGridDataEditorPrototype', function(instanceName){
		return nom.GridDataEditor;
	});

	exp.addAction = function(instanceName,when, actionType, action){};
    addService('addAction', function(instanceName){
        nom.enums.getActionManager(instanceName).addAction.apply(nom.enums,arguments);
    });
	exp.getEnumManagerTreeProto = function(){};
	addService('getEnumManagerTreeProto', function(){
		return nom.treeEditorPanel
	});

    exp.getPrimaryKeyId= function(){};
    addService('getPrimaryKeyId', function(){
        return nom.Type.PrimaryKey.UNIQUE_ID;
    });

    exp.getTreeNodesProxy= function(){};
    addService('getTreeNodesProxy', function(){
        return nom.treeNodesProxy;
    });
    /**
	 * Carga una instancia de nomencladores, asi en una sola carga se pueden hacer todas las operaciones sobre enums.export
	 * que se quiera
     * @param instanceName
     */
    exp.load= function(instanceName){};
    addService('load', function(instanceName){
        return true;
    });

    exp.showUI = function(instanceName, config){};
    addService('showUI', function(instanceName, config){
        nom.showUI(instanceName, config);
    });

    exp.getActionManager = function (instanceName, instanceModifier) {};
    addService('getActionManager', function (instanceName) {
		return nom.enums.getActionManager(instanceName);
    });

	exp.getDenomField = function(instanceName,_enum){};
    addService('getDenomField',function(instanceName,_enum){
    	return nom.enums.getDenomField(instanceName, _enum);
	});
    exp.getDenomFieldSync = function(instanceName, _enum){
    	return nom.enums.getDenomField(instanceName, _enum);
	};

    exp.eachEnumFieldSync = function () {
    	var enums = nom.enums;
    	return enums.eachEnumFieldSync.apply(enums,arguments);
    };

    /**
	 * Le pone la configuracion de nomencladores a una instancia
     * @param instanceName {string} 	  Nombre de la instancia de nomencladores. Agrupa las entidades
     * @param instanceModifier {string}   Modificador de nombre de instancia. Agrupa configuraciones.
     * @param config  {object}            @see ShowUI
     */
	exp.setInstanceConfig = function(instanceName, instanceModifier, config){};
	addService('setInstanceConfig', function(instanceName, instanceModifier, config){
		nom.enums.setInstanceConfig(instanceName, instanceModifier, config);
	});

	exp.getEnumInstanceSync = function(instanceName, instanceModifier){
	    return nom.enums.getInstance(instanceName,instanceModifier);
    }

})();