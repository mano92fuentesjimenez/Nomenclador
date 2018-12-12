<?php
include_once 'Types/BaseType.php';
include_once 'DBConections/DBConection.php';
require_once 'EnumsUtils.php';
require_once CARTOWEB_HOME.'include/Zend/Crypt/Rsa.php';
require_once 'Exceptions.php';
require_once 'ActionManager.php';

/**
 * Class ServerNomenclador
 */
class ServerNomenclador extends ClientResponderAdapter
{

    public function __construct()
    {
        self::$conn = $this->getPluginConnection();
    }

    public function initialize()
    {
    }

    public function handlePreDrawing($requ)
    {
        $enumResult = new NomencladorResult();
        $enumInstance = $requ->value['instanceName'];
        $actionM = ActionManager::getInstance($enumInstance);
        $actionM->setActions($requ->value['actions']);
        //[{"denominacion":"mena", "id_enum_rev_1100": "2",
        //        "id_enum_1100": "1"  ]
        try{
            switch ($requ->action) {
                case 'Nomenclador.checkDatasource':
                    $enumResult->resp = $this->verifyDatasource($enumInstance,$requ->value['sourcesConfig']);
                    break;
                case 'modEnum': {
                    EnumsRequests::modEnum(
                        $enumInstance,
                        $requ->value['changes'],
                        $requ->value['original']
                    );
                }
                    break;
                case 'addRecords':{
                    $enumId = $requ->value['enum'];
                    $modelRevision = $requ->value['modelRevision'];
                    $records = json_decode($requ->value['records'],true);
                    $data = array('add'=>$records);
                    $resp = EnumsRequests::submitChanges($enumInstance,$enumId,$modelRevision,$data );
                    $enumResult->resp = $resp['add'];
                }
                    break;
                case 'modRecord':{
                    $recordId = $requ->value['enumLoadIdRow'];
                    $modelRevision = $requ->value['modelRevision'];
                    $model = $requ->value['enum'];
                    $recordRevision = $requ->value['recordRevision'];
                    $record = json_decode($requ->value['record'],true);
                    $record[PrimaryKey::ID] = $recordId;
                    $record[Revision::ID] = $recordRevision;
                    $resp = EnumsRequests::submitChanges($enumInstance,$model,$modelRevision,array('mod'=>array($record)));

                    if(count($resp['underRevision']) !== 0){
                        throw new EnumRevisionConflict();
                    }
                    $enumResult->resp = $resp['modified'];
                }
                    break;
                case 'modEnumData': {
                    $enumId = $requ->value['enumId'];
                    $enums = Enums::getInstance($enumInstance);
                    $enum = $enums->getEnum($enumId);

                    $conn = EnumsUtils::getDBConnection($enum);
                    $conn->countRows($enum->getId(), $enum->getDataSource()->getSchema());
                    $count = $conn->fetchData();

                    $refs = Refs::getInstance($enumInstance);

                    $enumResult->resp =array(
                        'hasData' => $count[0]['count'] > 0,
                        'refs' => $refs->refs
                    );
                }
                    break;
                case 'getServerHeaders': {
                    $enumResult->resp = $this->getSeverHeaders($enumInstance);
                }
                    break;
                case 'getModels': {
                    $enumResult->resp = $this->getModels($enumInstance,null);
                }
                    break;
                case 'getModel': {
                    $modelId = $requ->value['model_id'];
                    try{
                        $enum = $this->getModels($enumInstance,$modelId);
                        $enumResult->resp = $enum;
                    }catch(Exception $e){
                        $enumResult->error = array(
                            'code'=>500,
                            'msg'=>$e->getMessage()
                        );
                    }
                } break;
                case 'addEnum': {
                    EnumsRequests::addEnum(
                        $enumInstance,
                        $requ->value['_enum'],
                        $requ->value['_enumPath'],
                        $requ->value["refs"]);
                }
                    break;
                case 'modRank': {
                    $simpleTree = SimpleTree::getInstance($enumInstance);
                    $simpleTree->modRank($requ->value['path'], $requ->value['name']);
                    $simpleTree->saveSimpleTree($enumInstance);
                }
                    break;
                case 'addRank': {
                    $simpleTree = SimpleTree::getInstance($enumInstance);
                    $simpleTree->addRank($requ->value['newRank']);
                    $simpleTree->saveSimpleTree($enumInstance);
                }
                    break;
                case 'getDbConfigs': {

                    $dataSources = DataSources::getInstance($enumInstance);
                    $enumResult->resp = $dataSources->getSources();
                }
                    break;
                case 'getDbSchemas': {

                    $dataSource = $requ->value["conn"];
                    $dataS = new DataSource($enumInstance,$dataSource);
                    $conn = new DBConnProxy($dataS);
                    $conn->getSchemas();
                    $enumResult->resp = $conn->fetchData();
                }
                    break;
                case 'addDbConfig': {
                    $dataSources = DataSources::getInstance($enumInstance);

                    $newDataSource = new DataSource($enumInstance, $requ->value['config']);
                    DataSources::decryptPass($newDataSource);
                    $enumResult->resp = $dataSources->addDataSource($newDataSource);
                    $dataSources->saveDataSources();
                }
                    break;
                case 'modDbConfig':{
                    $dataSources = DataSources::getInstance($enumInstance);

                    $newDataSource = new DataSource($enumInstance, $requ->value['config']);
                    DataSources::decryptPass($newDataSource);
                    $dataSources->modDataSource($newDataSource);
                    $dataSources->saveDataSources();

                }
                    break;
                case 'delDataSource': {

                    $dataSources = DataSources::getInstance($enumInstance);
                    $dataSources->remove($requ->value['id']);
                    $dataSources->saveDataSources();
                }
                    break;
                case 'submitChanges': {

                    $data = $requ->value['data'];
                    $modelRevision = $requ->value['modelRevision'];
                    $modelId = $requ->value['modelId'];
                    $enumResult->resp= EnumsRequests::submitChanges($enumInstance, $modelId, $modelRevision, $data);
                }
                    break;
                case 'getEnumData': {
                    $params = $requ->value;
                    $enumId = $params['enum'];

                    $loadAll = $params['enumLoadEnums'] ? true : false;
                    $enumResult->resp = $this->queryEnum(
                        $enumInstance,
                        $enumId,
                        array_key_exists('enumLoadPageOffset',$params) ? $params['enumLoadPageOffset'] : null,
                        array_key_exists('enumLoadPageSize',$params) ? $params['enumLoadPageSize']: null,
                        $loadAll,
                        array_key_exists('enumLoadIdRow',$params) ? $params['enumLoadIdRow'] : null,
                        null,
                        array_key_exists('enumLoadIdRow',$params) ? $params['enumLoadColumns'] : null,
                        array_key_exists('enumLoadWhere',$params) ? $params['enumLoadWhere'] : null,
                        null
                        );
                }
                    break;
                case 'getEnumDataIds': {
                    $params = $requ->value;
                    $enumId = $params['enum'];

                    $enumResult->resp = $this->queryEnumsIds(
                        $enumInstance,
                        $enumId,
                        array_key_exists('enumLoadWhere',$params) ? $params['enumLoadWhere'] : null
                    );
                }
                    break;
                case 'getTotalRecordsFromEnum':{
                    $enum_id = $requ->value['_enum'];
                    $enums = Enums::getInstance($enumInstance);
                    $enum = $enums->getEnumQuerier($enum_id);

                    $enumResult->resp = $enum->getTotalRecords($requ->value['where']);
                }
                    break;
                case 'getDataBasesNames': {

                    $config = $requ->value;
                    if (isset($config["dbname"])) {
                        unset($config["dbname"]);
                    }
                    $dataS = new DataSource($enumInstance,$config);
                    $conn = new DBConnProxy($dataS);
                    if (!$conn->getDBNames()) {
                        throw new EnumException('No se ha podido realizar la conecci&oacute;n');
                    }
                    $enumResult->resp =$conn->fetchData();
                }
                    break;
                case 'removeEnum': {
                    $enumResult->resp = EnumsRequests::removeEnum(
                        $enumInstance,
                        $requ->value['enumId'],
                        $requ->value['path']
                    );
                }
                    break;
                case 'removeRank': {
                    EnumsRequests::removeRank(
                        $enumInstance,
                        $requ->value['path']
                    );
                }
                    break;
                case 'hasDataSources': {
                    $dataS = DataSources::getInstance($enumInstance);
                    $enumResult->resp =$dataS->count();;
                }
                    break;
                case 'removeAll': {
                    $enums = Enums::getInstance($enumInstance);
                    $enums->removeAll();

                    $refs = Refs::getInstance($enumInstance);
                    $refs->removeAll();

                    $simpleTree = SimpleTree::getInstance($enumInstance);
                    $simpleTree->removeAll();
                }
                    break;
                case 'handleServiceRequest': {
                    return 'ok';
                }
                    break;
                case 'exportEnums': {
                    $enums = Enums::getInstance($requ->value['enumaInstance']);
                    $enumResult->resp = $enums->export($requ->value['config']);

                }
                    break;
                case 'importEnums': {
                    EnumsUtils::saveNewEnumConfigZip($_FILES['enum_import_input']['tmp_name']);
                    EnumsUtils::importEnums(
                        $enumInstance,
                        $requ->value['join_enums'],
                        $requ->value['prefix_path']);
                }
                    break;
                case 'enumHasData':{
                    $enums = Enums::getInstance($enumInstance);
                    $enum = $enums->getEnum($requ->value['enumId']);
                    $enum = $enum->getEnumStore();
                    $enumResult->resp =$enum->hasData();
                }
                    break;
                case 'delOnCascade':{
                    $enums = Enums::getInstance($enumInstance);
                    $enum = $enums->getEnumStore($requ->value['_enumId']);
                    $enum->delOnCascade($enumInstance);
                    $enumResult->resp = array();
                }
                    break;
                case 'MoveNodeInSimpleTree':{
                    $simpleTree = SimpleTree::getInstance($enumInstance);
                    $simpleTree->moveNode(
                        $requ->value['previousPath'],
                        $requ->value['point'],
                        $requ->value['newPath'],
                        $requ->value['targetPos']);
                }
                    break;
                case 'getEnumColumnData':{
                    $enumId = $requ->value['enumId'];
                    $config = $requ->value['config'];
                    $columnId = $requ->value['columnId'];

                    $fieldFilter = null;
                    $fieldValue = null;

                    if(isset($requ->value['filter'])){
                        $filter = $requ->value['filter'];
                        $fieldFilter = $filter['fieldFilter'];
                        $fieldValue = $filter['fieldValue'];
                    }
                    $enumResult->resp =EnumRestMethods::getEnumColumnData($enumInstance, $enumId,$config,$columnId, $fieldFilter, $fieldValue);
                }
                    break;
                case 'getPublicKey':{
                    $enumResult->resp =array('publicKey'=>EnumsUtils::getPublicKey());
                }
                    break;
                case 'createKeys':{
                    $pathToDefaaults = EnumsUtils::getdefaultsConfsPath();
                    if(!file_exists($pathToDefaaults.'public_key.pub') || !file_exists($pathToDefaaults.'private_key.pem')) {
                        require_once CARTOCLIENT_HOME . 'plugins/nomenclador/common/createKeys.php';
                        nomenclador_createKeys();
                    }
                }
                    break;
                default :
                    {
                        if(isset($requ->value['type'])){
                            $type = $requ->value['type'];
                            $func = $type.'::'.$requ->action;
                            $enumResult ->resp =call_user_func($func, $requ->value);
                        }
                        else {
                            $enumResult->resp = $this->{$requ->action}($requ->value);
                        }

                    }
                    break;
            }
        }
        catch (EnumException $e){
            $enumResult->error = array('msg'=>$e->getMessage(),'type'=>$e->getExceptionObj(), 'code'=>$e->getCode());
        }
        catch (Exception $e){
            $enumResult->error = array('msg'=>"Error desconocido: {$e->getMessage()}",'code'=>$e->getCode());
        }


        return $enumResult;
    }

//    /**
//     * @param $enum Enum
//     * @param $offset
//     * @param $limit
//     * @param $idRow
//     * @param $fieldsToGet
//     * @param $inData
//     * @param $loadAllData
//     * @param $where
//     */
//    public function ff($enum, &$offset, &$limit, &$idRow, &$fieldsToGet, &$inData, &$loadAllData, &$where){
////
////        if($enum->getName() == 'pais'){
////            $inData = array(array(PrimaryKey::ID=> 2, 'otro campo'=> 'haaaaaaaa'));
////        }
////        return Enum::CONTINUE_P;
//    }
//    public function gg($enum, &$data){
////        foreach ($data as &$record){
////            if($record[PrimaryKey::ID] ==1)
////                $record['denominacion'] = 'kkkk';
////        }
//    }
//    public function cc($enum){
////        if($enum->getName() == 'pais')
////            return 1;
//    }
    /**
     * Adiciona records en la instancia dada en el nomenclador dado
     * @param $enumInstance  {string} Nombre de instancia de nomencladores
     * @param $enumId        {string} Identificador del nomenclador
     * @param $records       {array}  Records
     * @throws EnumException
     */
    public function addRecords($enumInstance, $enumId, $records){
        $enums = Enums::getInstance($enumInstance);
        $enum = $enums->getEnum($enumId);
        $enum->addRecords($records);

    }
    public function getResumeViewTpl(){
        $path = $this->serverContext->getProjectHandler()->getPluginPath('nomenclador');
        $tplPath = $path.'templates/resumeView/resumeViewTable.tpl';
        $res = null;
        if(file_exists($tplPath)){
            $res = file_get_contents($tplPath);
        }
        return $res;
    }

    public function exportResumeViewTpl2Pdf($params)
    {
        require_once CARTOSERVER_HOME . 'include/MPDF57/mpdf.php';

        $pdf = new mPDF(
            '',
            'A2',
            0,
            10,
            10,
            10,
            35,
            10,
            5,
            10
        );

        $pdf->SetDisplayMode('fullpage');

        $path = $this->serverContext->getProjectHandler()->getPluginPath('nomenclador');
        $tplPath = $path . 'htdocs/css/nomenclador.plugin.resumeView.css';
        $htmlStyle = null;
        if (file_exists($tplPath)) {
            $htmlStyle = file_get_contents($tplPath);
            $pdf->WriteHTML($htmlStyle, 1);
        }

        $pdf->WriteHTML($params['resumeViewHTML']);


        $pdfName = 'generatedNomencladorPdf_' . rand(0, 9999) . '.pdf';
        $name = CARTOWEB_HOME . 'htdocs/generated/pdf/' . $pdfName;

        unlink($name);

        $pdf->Output($name, 'F');

        return array(
            'document' => CARTOWEB_HTTP . 'generated/pdf/' . $pdfName
        );

    }

    public function getSeverHeaders($enumInstance){
        return EnumsRequests::getEnumHeaders($enumInstance);
    }

    public function obtenerNomencladorDetalles($nomenclador, $categoria, $elemento, $extraParams){
        $enumInstance = isset($extraParams) && is_array($extraParams) && array_key_exists('instance',$extraParams) ? $extraParams['instance'] : 'system';

        $enums = Enums::getInstance($enumInstance);
        $enum = $enums->getEnumQuerier($categoria);

        $result = $enum->queryEnum(null, null, false,$elemento );

        $r = reset($result);
        return array(
            'text'=>$r['denominacion'],
            'id'=>$elemento
        );
    }

    public function getIntegrationComponents()
    {
        $res = array();
        $sc = $this->serverContext;
        $sc->loadPlugins();
        $plgMng = $sc->getPluginManager();
        if (isset($plgMng->integracion)) {
            $integ = $plgMng->integracion;
            $nomencladores = $integ->obtenerNomencladores();

            $res = Utils::json_decode($nomencladores->resp);
        }
        return $res;
    }

    public function getEnumsDynamicField()
    {
        $dynFlds = array();

        $cfg = $this->getConfig();

        $dynamicFields = get_object_vars($cfg->dynamicFields);

        $integration = $this->getIntegrationComponents();

        foreach ($integration as $id => $item) {
            if (in_array($id, $dynamicFields)) {
                $config = property_exists($cfg, $id) ? $cfg->{$id} : new stdClass();
                $dynFlds[$id] = array(
                    'type' => 'dynamic_'.$id,
                    'isIntegrationField'=>true,
                    'label' => strtoupper($item->name),
                    'hidden' => false,
                    'integrationId' => $id,
                    'showDetails'=>property_exists($config, 'showDetails') ? $config->showDetails == '1' : true,
                    'displayPreview'=>property_exists($config, 'displayPreview') ? $config->displayPreview == '1' : false,
                    'loadCategories' => property_exists($config, 'loadCategories') ? $config->loadCategories == '1' : false
                );
            }
        }

        return $dynFlds;
    }

    public function getPrimaryKeyFieldName(){
        return PrimaryKey::ID;
    }

    public function queryEnum($enumInstance, $enumId, $pageOffset, $pageSize, $loadAll, $idRow, $fieldLazyToEval, $fields, $where,$inData){
        $enums = Enums::getInstance($enumInstance);
        $enum = $enums->getEnumQuerier($enumId);

        return $enum->queryEnum($pageOffset,$pageSize,$loadAll, $idRow,$fieldLazyToEval,$fields,$where,$inData );
    }

    static $conn =null;
    public static function getConn(){
        return self::$conn;
    }

    public function getModels($enumInstance,$modelId){
        $enums = Enums::getInstance($enumInstance);

        if(isset($modelId)){
            $enum = $enums->getEnum($modelId);
            if(!isset($enum)){
                throw new Exception("Model: \"$modelId\", doesn't exists");
            }else{
                $enum_ = $enum->enum_tree;
                $enum_['idField'] = PrimaryKey::ID;
                return $enum_;
            }
        }else{
            $enums_ = array();
            foreach ($enums->enums as $enumId=>$enum){
                $enum['idField'] = PrimaryKey::ID;
                $enums_[]=$enum;
            }
            return $enums_;
        }
    }

    public function queryEnumsIds($enumInstance, $enumId, $where){
        $ids = $this->queryEnum(
            $enumInstance,
            $enumId,
            null,
            null,
            false,
            null,
            null,
            array(),
            $where,
            null
        );
        $resp = array();
        foreach ($ids as $id){
            $resp[] = $id[PrimaryKey::ID];
        }
        return $resp;
    }

    //todo esto es temporal para pasar del amacenamiento de nomencladores al estandart definido para REST
    private function parseTree($roots,$parent=null,&$arr=null,&$id = 0){
        $root = !isset($arr);
        $arr = !$root ? $arr : array();
        foreach ($roots as $node){
            $isModel = !array_key_exists('childs',$node);

            $id++;

            $nd = array(
                'id'=>$id,
                'parent_id'=>$root ? null : $parent['id'],
                '_id'=>$node['idNode'],
                '_parent_id'=>isset($parent) ? null : $parent['_id'],
                'model_id'=>$isModel ? $node['idNode'] : null,
                'name'=>$node['text']
            );
            $arr[]=$nd;
            if(!$isModel && count($node['childs'])){
                $this->parseTree(
                    $node['childs'],
                    $nd,
                    $arr,
                    $id
                );

                //$id = end($arr)['id'];
            }
        }
        return $arr;
    }
    public function getStandartTree($instance){
        $tree = $this->getSeverHeaders($instance)['simpleTree'];

        $treeArr = $this->parseTree($tree['childs']);

        return $treeArr;
    }
    public function getCategoryModelDefinition($id){
        return array(
            'name'=>'Categorías',
            'id'=>$id,
            'description'=>'',
            'denomField'=>'name',
            'fields'=>array(
                'id'=>array (
                    'type' => 'PrimaryKey',
                    'needed'=>true,
                    'header'=>'id',
                    'order'=>1,
                    'id' => 'id',
                ),
                'parent_id'=>array(
                    'type'=>'DB_Number',
                    'needed'=>false,
                    'properties'=>array(
                        'field'=>'id',
                        '_enum'=>$id
                    ),
                    'header'=>'parent_id',
                    'order'=>2,
                    'id'=>'parent_id'
                ),
                'name'=>array(
                    'type'=>'DB_String',
                    'needed'=>true,
                    'header'=>'Nombre',
                    'order'=>3,
                    'id'=>'name'
                ),
                'model_id'=>array(
                    'type'=>'DB_EnumChoser',
                    'needed'=>true,
                    'header'=>'model_id',
                    'order'=>4,
                    'id'=>'model_id'
                )
            ),
            'idField'=>'id'
        );
    }
    public function getCategoryRecordById($instance,$idRecord){
        $tree = $this->getStandartTree($instance);
        $id = ((float)$idRecord)-1;
        if(!isset($tree[$id]))
            throw new Exception('Record doesnt exists');

        $rec = $tree[$id];

        if(isset($rec['model_id'])){
            $modelDef = $this->getModels($instance,$rec['model_id']);
            $rec['name']=$modelDef['name'];
        }

        return $rec;
    }

    /**
     * Verifica si existe la configuracion de los origigenes de datos de los nomencladores para una instancia y la crea en caso de no existir
     * @param $instance                     {String}        Instancia de nomencladores
     * @param $configs                      {jsonObject}    Objeto con los origenes de datos para cada id de datasource
     * @throws CartocommonException
     * @throws CartoserverException
     */
    public function verifyDatasource($instance, $configs){
        $dts = DataSources::getInstance($instance);

        foreach ($configs as $id=> $config){
            $conn = $this->getConnectionTo($config['moduleConfigId']);
            //todo verificar que exista la coneccion
            $dsn = $conn->dsn;
            $dataObj = $dts->getSource($id);

            if(!isset($dataObj->dataSource)){
                $dts->addDataSourceFromDSN(
                    $id,
                    $dsn['username'],
                    $dsn['password'],
                    $config['schema'],
                    $dsn['database'],
                    $dsn['hostspec'],
                    $dsn['port']
                );

                $dts->saveDataSources();
            }
        }
    }

    /**
     * Verifica si existe la configuracion de nomencladores con el arbol de modelos para una instancia y la crea en caso de no existir
     * @param $enumInstance     {String}        Instancia de nomencladores
     * @param $tree             {jsonObject}    Arbol de nomencladores   ej: {childs:[{text:'asd'}]}
     * @return bool             Retorna true si no existia y se creo y false si ya existia la configracion
     */
    public function verifySimpleTree($enumInstance,$tree){
        if(!SimpleTree::InstanceExist($enumInstance)){
            SimpleTree::AddSimpleTree($enumInstance,Utils::json_encode($tree));
            return true;
        }else
            return false;

    }

    /**
     * Verifica si existe la configuracion con las definiciones de los nomencladores para una instancia y la crea en caso de no existir
     * @param $enumInstance     {String}        Instancia de nomencladores
     * @param $enums            {jsonObject}    Objeto con las definiciones de los nomencladores
     * @return bool             Retorna true si no existia y se creo y false si ya existia la configracion
     */
    public function verifyEnums($enumInstance,$enums){
        if(!Enums::InstanceExist($enumInstance)){
            Enums::AddEnumsToDb($enumInstance,$enums);
            return true;
        }else
            return false;
    }

    /**
     * Verifica si existe la configuracion con las dependencias entre los nomencladores para una instancia y la crea en caso de no existir
     * @param $enumInstance     {String}        Instancia de nomencladores
     * @param $refs             {jsonObject}      Objecto con las dependencias de los nomencladores
     * @return bool             Retorna true si no existia y se creo y false si ya existia la configracion
     */
    public function verifyRefs($enumInstance,$refs=array()){
        if(!Refs::InstanceExist($enumInstance)){
            Refs::AddRefsToDB($enumInstance,Utils::json_encode($refs));
            return true;
        }else
            return false;
    }

    /**
     * Verifica todas las configuraciones de nomenclador
     * @param $instance             {String}        Instancia de nomencladores
     * @param $dataSources          {jsonObject}    Objeto con los origenes de datos para cada id de datasource
     * @param $enums                {jsonObject}    Objeto con las definiciones de los nomencladores
     * @param $simpleTree           {jsonObject}    Arbol de nomencladores   ej: {childs:[{text:'asd'}]}
     * @param array $refs           {jsonObject}      Objecto con las dependencias de los nomencladores
     */
    public function verifyConfigurations($instance,$dataSources,$enums,$simpleTree,$refs=array()){
        $this->verifyDatasource($instance,$dataSources);
        $this->verifyEnums($instance,$enums);
        $this->verifySimpleTree($instance,$simpleTree);
        $this->verifyRefs($instance,$refs);
    }

}
class EnumRestMethods{

    public static function getEnumColumnData($enumInstance, $enumId, $config, $columnId, $fieldFilter, $fieldValue){
        $enums = Enums::getInstance($enumInstance);
        $enum = $enums->getEnumQuerier($enumId);

        $columnId = isset($columnId) ? $columnId : $enum->getDenomFieldId();

        $limit = is_array($config) ? (
            is_numeric($config['limit']) ? $config['limit'] : 999999)
            :999999;
        $offset = is_array($config) ? (
        is_numeric($config['offset']) ? $config['offset'] : 0)
            :0;

        return $enum->queryEnum($offset,$limit,false,null,null,array($columnId=>$columnId));
    }
}

