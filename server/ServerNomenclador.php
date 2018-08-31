<?php
include_once 'Types/BaseType.php';
include_once 'DBConections/DBConection.php';
require_once 'Enums.php';
require_once CARTOWEB_HOME.'include/Zend/Crypt/Rsa.php';
require_once 'Exceptions.php';
require_once 'ActionManager.php';

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
        $enumInstance = $requ->value['enumInstance'];
        $actionM = ActionManager::getInstance($enumInstance);
        $actionM->setActions($requ->value['actions']);
        
        try{
            switch ($requ->action) {

                case 'modEnum': {
                    EnumsRequests::modEnum(
                        $requ->value['enumInstance'],
                        $requ->value['changes'],
                        $requ->value['original']
                    );
                }
                    break;
                case 'modEnumData': {
                    $enumId = $requ->value['enumId'];
                    $enumInstance = $requ->value['enumInstance'];
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
                    $enumResult->resp = $this->getSeverHeaders($requ->value['enumInstance']);
                }
                    break;
                case 'addEnum': {
                    EnumsRequests::addEnum(
                        $requ->value['enumInstance'],
                        $requ->value['_enum'],
                        $requ->value['_enumPath'],
                        $requ->value["refs"]);
                }
                    break;
                case 'modRank': {
                    $enumInstance =$requ->value['enumInstance'];
                    $simpleTree = SimpleTree::getInstance($enumInstance);
                    $simpleTree->modRank($requ->value['path'], $requ->value['name']);
                    $simpleTree->saveSimpleTree($enumInstance);
                }
                    break;
                case 'addRank': {
                    $enumInstance =$requ->value['enumInstance'];
                    $simpleTree = SimpleTree::getInstance($enumInstance);
                    $simpleTree->addRank($requ->value['newRank']);
                    $simpleTree->saveSimpleTree($enumInstance);
                }
                    break;
                case 'getDbConfigs': {

                    $dataSources = DataSources::getInstance($requ->value['enumInstance']);
                    $enumResult->resp = $dataSources->getSources();
                }
                    break;
                case 'getDbSchemas': {

                    $dataSource = $requ->value["conn"];
                    $dataS = new DataSource($requ->value['enumInstance'],$dataSource);
                    $conn = new DBConnProxy($dataS);
                    $conn->getSchemas();
                    $enumResult->resp = $conn->fetchData();
                }
                    break;
                case 'addDbConfig': {
                    $enumInstance = $requ->value['enumInstance'];
                    $dataSources = DataSources::getInstance($enumInstance);

                    $newDataSource = new DataSource($enumInstance, $requ->value['config']);
                    DataSources::decryptPass($newDataSource);
                    $enumResult->resp = $dataSources->addDataSource($newDataSource);
                    $dataSources->saveDataSources();
                }
                    break;
                case 'modDbConfig':{
                    $enumInstance = $requ->value['enumInstance'];
                    $dataSources = DataSources::getInstance($enumInstance);

                    $newDataSource = new DataSource($enumInstance, $requ->value['config']);
                    DataSources::decryptPass($newDataSource);
                    $dataSources->modDataSource($newDataSource);
                    $dataSources->saveDataSources();

                }
                    break;
                case 'delDataSource': {

                    $dataSources = DataSources::getInstance($requ->value['enumInstance']);
                    $dataSources->remove($requ->value['id']);
                    $dataSources->saveDataSources();
                }
                    break;
                case 'submitChanges': {

                    $data = $requ->value['data'];
                    $enum = $requ->value['_enum'];

                    $enumResult->resp= EnumsRequests::submitChanges($requ->value['enumInstance'],$enum, $data);
                }
                    break;
                case 'getEnumData': {
                    $params = $requ->value;
                    $enumInstance = $requ->value['enumInstance'];
                    $enumId = $params['enum'];

                    $loadAll = $params['enumLoadEnums'] ? true : false;
                    $enumResult->resp = $this->queryEnum(
                        $enumInstance,
                        $enumId,
                        $params['enumLoadPageOffset'],
                        $params['enumLoadPageSize'],
                        $loadAll,
                        $params['enumLoadIdRow'],
                        null,
                        $params['enumLoadColumns'],
                        $params['enumLoadWhere'],
                        null
                        );
                }
                    break;
                case 'getTotalRecordsFromEnum':{
                    $enumInstance = $requ->value['enumInstance'];
                    $enum_id = $requ->value['_enum'];
                    $enums = Enums::getInstance($enumInstance);
                    $enum = $enums->getEnum($enum_id);

                    $enumResult->resp = $enum->getTotalRecords($requ->value['where']);
                }
                    break;
                case 'getDataBasesNames': {

                    $config = $requ->value;
                    if (isset($config["dbname"])) {
                        unset($config["dbname"]);
                    }
                    $dataS = new DataSource($requ->value['enumInstance'],$config);
                    $conn = new DBConnProxy($dataS);
                    if (!$conn->getDBNames()) {
                        throw new EnumException('No se ha podido realizar la conecci&oacute;n');
                    }
                    $enumResult->resp =$conn->fetchData();
                }
                    break;
                case 'removeEnum': {
                    $enumResult->resp = EnumsRequests::removeEnum(
                        $requ->value['enumInstance'],
                        $requ->value['enumId'],
                        $requ->value['path']
                    );
                }
                    break;
                case 'removeRank': {
                    EnumsRequests::removeRank(
                        $requ->value['enumInstance'],
                        $requ->value['path']
                    );
                }
                    break;
                case 'hasDataSources': {
                    $dataS = DataSources::getInstance($requ->value['enumInstance']);
                    $enumResult->resp =$dataS->count();;
                }
                    break;
                case 'removeAll': {
                    $enumInstance = $requ->value['enumInstance'];
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
                        $requ->value['enumInstance'],
                        $requ->value['join_enums'],
                        $requ->value['prefix_path']);
                }
                    break;
                case 'enumHasData':{
                    $enums = Enums::getInstance($requ->value['enumInstance']);
                    $enum = $enums->getEnum($requ->value['enumId']);
                    $enumResult->resp =$enum->hasData();
                }
                    break;
                case 'delOnCascade':{
                    $enumInstance = $requ->value['enumInstance'];
                    $enums = Enums::getInstance($enumInstance);
                    $enum = $enums->getEnum($requ->value['_enumId']);
                    $enum->delOnCascade($enumInstance);
                    $enumResult->resp = array();
                }
                    break;
                case 'MoveNodeInSimpleTree':{
                    $simpleTree = SimpleTree::getInstance($requ->value['enumInstance']);
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
                    $enumInstance = $requ->value['enumInstance'];

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
            $enumResult->error = array('msg'=>$e->getMessage(),'type'=>$e->getExceptionObj());
        }
        catch (Exception $e){
            $enumResult->error = array('msg'=>"Error desconocido: {$e->getMessage()}");
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
        $enumInstance = 'system';

        $enums = Enums::getInstance($enumInstance);
        $enum = $enums->getEnum($categoria);

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
        $enum = $enums->getEnum($enumId);

        return $enum->queryEnum($pageOffset,$pageSize,$loadAll, $idRow,$fieldLazyToEval,$fields,$where,$inData );
    }

    static $conn =null;
    public static function getConn(){
        return self::$conn;
    }

}
class EnumRestMethods{

    public static function getEnumColumnData($enumInstance, $enumId, $config, $columnId, $fieldFilter, $fieldValue){
        $enums = Enums::getInstance($enumInstance);
        $enum = $enums->getEnum($enumId);

        $columnId = $columnId != null ? $columnId : $enum->getDefaultFieldId();

        $limit = is_array($config) ? (
            is_numeric($config['limit']) ? $config['limit'] : 999999)
            :999999;
        $offset = is_array($config) ? (
        is_numeric($config['offset']) ? $config['offset'] : 0)
            :0;

        return $enum->queryEnum($offset,$limit,false,null,null,array($columnId=>$columnId));
    }
}


