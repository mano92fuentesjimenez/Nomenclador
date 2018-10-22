<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:23
 */

class DataSources
{

    public $dataSources;
    public $enumInstance;
    const DEFAULTNAME = 'Local';

    private function __construct($enumInstance)
    {

//        $pathDataS = DataSources::getDataSourcePath();

//        if (!file_exists($pathDataS)) {
//            //La coneccion por defecto siempre tiene que ser a postgree.
//            $dbData = array(
//                DataSources::DEFAULTNAME => array(
//                    'dbname' => 'Genesig_2.0',
//                    'host' => 'Genesig.BD.xetid',
//                    'user' => 'ing',
//                    'password' => 'ingsig09Grm',
//                    'port' => '5432',
//                    'dataSource' => DBConnectionTypes::POSTGREE_9_1,
//                    'id' => DataSources::DEFAULTNAME,
//                    'name' => DataSources::DEFAULTNAME,
//                    'schema' => 'mod_nomencladores'
//                )
//            );
//            chmod($pathDataS, 0777);
//            file_put_contents($pathDataS, Utils::json_encode($dbData));
//        }
        $conn = EnumsUtils::getConn();
        require_once __DIR__.'/../DBConections/DBConection.php';
        $this->enumInstance = $enumInstance;
        $projName = EnumsUtils::getProjectName();
        $dataSources = $this->getData($conn);
        if(count($dataSources) == 0){
            $defaultValue = json_encode($this->getDefaultValue());
            $actions = ActionManager::getInstance($this->enumInstance);
            $conn->simpleQuery("insert into mod_nomenclador.dataSources(v,proj,enum_instance) values ('$defaultValue', '$projName','$enumInstance')");
            try {
                $actions->callInstanceAddingActions($this);
            }
            catch (Exception $e){
                $conn->simpleQuery("delete from mod_nomenclador.dataSources where proj like '$projName' and enum_instance like '$enumInstance'");
                throw $e;
            }

            $dataSources = $this->getData($conn);
        }
        $dataSources = reset($dataSources);
        $this->dataSources = json_decode($dataSources['v'], true);
    }

    private function getData($conn){
        $enumInstance = $this->enumInstance;

        $projName = EnumsUtils::getProjectName();
        $sql = "select * from mod_nomenclador.datasources where proj = '$projName' and enum_instance = '$enumInstance'";
        $dataSources = $conn->getAll($sql, null, DB_FETCHMODE_ASSOC);
        EnumsUtils::checkDBresponse($dataSources);
        return $dataSources;
    }

    private static $instance = array();

    private function getDefaultValue(){
        return array();
    }

    public static function getInstance($enumInstance)
    {
        if(!$enumInstance)
            throw new Exception();
        if (!array_key_exists($enumInstance, self::$instance)) {
            self::$instance[$enumInstance] = new DataSources($enumInstance);
        }
        return self::$instance[$enumInstance];
    }

    public static function getDataSourcePath()
    {
        return EnumsUtils::getConfPath('dataSource.json');
    }

    public static function getPathToExportItem($enumInstance)
    {

        $dataSources = DataSources::getInstance($enumInstance);
        $toExport = array();
        $publicKeyStr = EnumsUtils::getPublicKey();
        $publicKey = new Zend_Crypt_Rsa_Key_Public($publicKeyStr);
        $rsa = new Zend_Crypt_Rsa();

        foreach ($dataSources->dataSources as $key => $values) {
            $toExport[$key] = $values;
            $toExport[$key]['password'] = $rsa->encrypt($values['password'], $publicKey, Zend_Crypt_Rsa::BASE64);
        }
        $path = EnumsUtils::getTempPath() . 'dataSources.json';
        file_put_contents($path, json_encode($toExport));
        return $path;
    }

    public function getSource($sourceName)
    {
        if(!array_key_exists($sourceName, $this->dataSources)){
            $actionM = ActionManager::getInstance($this->enumInstance);
            $actionM->callUndefinedExistDataSourceActions($sourceName);
        }

        return new DataSource($this->enumInstance,$this->dataSources[$sourceName]);
    }

    public function getSources()
    {
        $resp = $this->dataSources;
        foreach ($resp as $key => &$value) {
            unset($value['password']);
        }
        return $resp;
    }

    public function addDataSource($newDataSource)
    {
        if(is_null($this->dataSources))
            $this->dataSources = $this->getDefaultValue();

        $ds = isset($this->dataSources[$newDataSource->dataSource['id']]) ?
            $this->dataSources[$newDataSource->dataSource['id']] : null;

        if (is_array($newDataSource)) {
            $newDataSource = new DataSource($this->enumInstance,$newDataSource);
        }
        if ($ds && $ds != $newDataSource->dataSource) {
            throw new EnumException("No se puede a&ntilde;adir la fuente de datos '{$newDataSource->dataSource['name']}'', porque ya existe otra con el mismo nombre");
        }

        if (!isset($newDataSource->dataSource['id'])) {
            $newDataSource->dataSource['id'] = $newDataSource->dataSource['name'];
            if ($this->dataSources[$newDataSource->dataSource['id']]) {
                $newDataSource->dataSource['id'] = $newDataSource->dataSource['id'] . rand(0, 100000);
            }
        }
        $this->dataSources[$newDataSource->dataSource['id']] = $newDataSource->dataSource;

        $conn = new DBConnProxy($newDataSource);
        $conn->createSchema($newDataSource->getSchema());
        $conn->closeConnection();
        return $newDataSource->getId();
    }
    public function addDataSourceFromDSN($id, $user, $pass, $schema, $db, $host, $port){
        $ds = array(
            "dbname" => $db,
            "host"=>$host,
            "user"=>$user,
            "password"=>$pass,
            "port"=>$port,
            "dataSource"=> DBConnectionTypes::POSTGREE_9_1,
            "id" => $id,
            "name"=>$id,
            "schema"=>$schema
        );
        $this->addDataSource($ds);
    }

    public static function decryptPass(&$dataSource)
    {

        $pathToPrivateKey = EnumsUtils::getdefaultsConfsPath() . 'private_key.pem';

        $key = new Zend_Crypt_Rsa_Key_Private(file_get_contents($pathToPrivateKey));
        $rsa = new Zend_Crypt_Rsa();
        $pass = $rsa->decrypt($dataSource->dataSource['password'], $key, Zend_Crypt_Rsa::BASE64);
        $dataSource->dataSource['password'] = $pass;
    }

    public function addDatasources($dataSourcesTree)
    {
        foreach ($dataSourcesTree as $dataSource) {
            $this->addDataSource(new DataSource($this->enumInstance, $dataSource));
        }
    }

    public function importDataSources($dataSourcesTree)
    {
        foreach ($dataSourcesTree as $dataSource) {
            $dS = new DataSource($this->enumInstance, $dataSource);
            DataSources::decryptPass($dS);
            $this->addDataSource($dS);
        }
    }

    public function count()
    {
        return count($this->dataSources);
    }

    public function saveDataSources()
    {
        $conn = EnumsUtils::getConn();
        $projName = EnumsUtils::getProjectName();
        $data = json_encode($this->dataSources);

        $sql = "update mod_nomenclador.datasources set v='$data' where proj= '$projName' and enum_instance='{$this->enumInstance}'";
        $conn->simpleQuery($sql);
    }

    public function removeAll()
    {
        $enums = Enums::getInstance($this->enumInstance);
        if ($enums->count() > 0) {
            throw new EnumException('No se pueden eliminar fuentes de datos que est&aacute;n siendo usadas.');
        }

        unlink(self::getDataSourcePath());
    }

    public function remove($id)
    {
        $this->testReferences($id);
        unset($this->dataSources[$id]);
    }

    private function testReferences($id)
    {
        $enums = Enums::getInstance($this->enumInstance);
        foreach ($enums->getEnums() as $enumId) {
            $enum = $enums->getEnum($enumId);
            if ($enum->getDataSource()->getId() == $id) {
                throw new EnumException('La fuente de datos no se puede modifiacar porque esta siendo usado por el nomenclador:' . $enum->getName() . '.');
            }

        }
    }

    public function modDataSource($dataSource)
    {

        $this->testReferences($dataSource->getId());
        $this->dataSources[$dataSource->getId()] = $dataSource->getConnData();

        $conn = new DBConnProxy($dataSource);
        $conn->createSchema($dataSource->getSchema());


    }

}

class DataSource
{
    public $dataSource;

    public function __construct( $enumInstance,$sourceTree)
    {
        if (is_string($sourceTree)) {
            $d = DataSources::getInstance($enumInstance);
            $d = $d->getSource($sourceTree);
            $this->dataSource = $d->dataSource;
            return;
        }
        $this->dataSource = $sourceTree;
    }

    public function getDataSourceType()
    {
        return $this->dataSource['dataSource'];
    }

    public function getSchema()
    {
        return $this->dataSource['schema'];
    }

    public function getKey()
    {
        return json_encode($this->dataSource);
    }

    public function getType()
    {
        return $this->dataSource['dataSource'];
    }

    public function getConnData()
    {
        return $this->dataSource;
    }

    public function getId()
    {
        return $this->dataSource['id'];
    }
    public function getDataBaseName(){
        return $this->dataSource['dbname'];
    }

    public function distinctDs($dS)
    {
        $oDS = $this->dataSource;
        $dS = $dS->dataSource;
        return ($oDS['dataSource'] != $dS['dataSource']
            || gethostbyname($oDS['host']) != gethostbyname($dS['host'])
            || $oDS['dbname'] != $dS['dbname']
            || $oDS['port'] != $dS['port']);

    }
}