<?php

include_once "Types/BaseType.php";
include_once "DBConections/DBConection.php";
include_once 'Exceptions.php';

require_once 'EnumComps/DataSources.php';
require_once 'EnumComps/DefaultFields.php';
require_once 'EnumComps/Enums.php';
require_once 'EnumComps/Field.php';
require_once 'EnumComps/Refs.php';
require_once 'EnumComps/SimpleTree.php';

class EnumsRequests
{

    public static function getEnumHeaders($enumInstance)
    {
        $enums = null;
        $enums = Enums::getInstance($enumInstance);
        $simpleTree = SimpleTree::getInstance($enumInstance);
        $defaultFields = DefaultFields::getInstance($enumInstance);

        $obj = Array();
        $obj['enums'] = $enums->enums;
        $obj['simpleTree'] = $simpleTree->simpleTree;
        $obj['defaultFields'] = $defaultFields->defaultFields;

        return $obj;
    }


    public static function modEnum($enumInstance, $changes, $original)
    {
        $actionsM = ActionManager::getInstance($enumInstance);
        $enums = Enums::getInstance($enumInstance);
        $oldEnum = $enums->getEnum($changes['_enum']['id']);

        $newEnum = new Enum($enumInstance,$changes['_enum'], $enums);
        $actionsM->callPreEnumModActions($newEnum);

        //Se tiene que verificar que el nomenclador que se esta modificando, es la ultima modificacion del mismo
        //o sea comparar si son iguales el nomenclador en el server y el nomenclador sin modificar en el cliente.
        if (!Enum::enumEquals($oldEnum, $original)) {
            throw new EnumException('En lo que usted modifico el nomenclador, alguien ha modificado o  
             borrado al mismo.');
        }
        if (!$enums->validateEnum($enumInstance, $newEnum)) {
            throw new EnumException('Mientras este nomenclador se modificaba, alguien cambio las nuevas dependencias
            de este por lo que se crearon inconsistencias, modifique de nuevo el nomenclador.');
        }
        $oldEnum->canModifyFields($changes['mod']);
        $oldEnum->canDeleteFields($changes['del']);

        if (!$enums->validateEnum($enumInstance,$newEnum)) {
            throw new EnumException('Se han modificado los nomencladores mientras usted modificaba el suyo, lo que
            llevo a que se creen iconsistencias si este nomenclador es modificado, vuelva a crearlo.');
        }

        $conn = EnumsUtils::getDBConnection($newEnum);

        $connType = $newEnum->getDataSource()->getDataSourceType();
        $schema = $newEnum->getDataSource()->getSchema();


        $conn->beginTransaction();
        //add fields
        foreach ($changes['add'] as $key => $value) {
            $addfield = new Field($value);
            $props = $addfield->getProperties();
            $addType = $addfield->getType();
            if (!$addType::savedInBD()) {
                continue;
            }
            if($addType =='DB_Enum' && $props['multiSelection']){
                $enum2 = $enums->getEnum($props['_enum']);
                $addType::createMultiTable($newEnum, $enum2, $conn);
            }
            else if (!$conn->addColumn($newEnum->getId(), $schema, $key, $addType::getDBTypeCreation($newEnum->enumInstance, $connType, $addfield->getProperties(), $newEnum),$addfield->getHeader()) ||
                !$conn->setDefaultValueForColumn($newEnum->getId(), $schema, $key, $addType::getDefaultValue($connType, $addfield->getProperties()))
            ) {
                throw new EnumException("Hubo un error a&ntilde;adiendo la columna");
            }
        }
        //mod fields
        foreach ($changes['mod'] as $key => $value) {
            $modField = new Field($value);
            $modProps = $modField->getProperties();
            $oldField = $oldEnum->getField($key);
            $oldProps = $oldField->getProperties();
            $modType = $modField->getType();
            $oldType = $oldEnum->getField($key)->getType();
            if (!$oldType::savedInBD() && !$modType::savedInBD()) {
                continue;
            }
            else if (!$oldType::savedInBD()) {
                if($modType=='DB_Enum' && $modProps['multiSelection'] ){

                    $enum2 = $enums->getEnum($modProps['_enum']);
                    $modType::createMultiTable($newEnum, $enum2, $conn);
                }
                else if (!$conn->addColumn($newEnum->getId(), $schema, $key, $modType::getDBTypeCreation($newEnum->enumInstance, $connType, $modField->getProperties(), $newEnum), $modField->getHeader()) ||
                    !$conn->setDefaultValueForColumn($newEnum->getId(), $schema, $key, $modType::getDefaultValue($connType, $modField->getProperties()))
                ) {
                    throw new EnumException("Hubo un error modificando la columna");
                }

            }
            else if (!$modType::savedInBD()) {
                if($oldType == 'DB_Enum' && $oldProps['multiSelection']){
                    $enum2 = $enums->getEnum($oldProps['_enum']);
                    $oldType::removeMultiTable($oldEnum, $enum2, $conn);
                }
                else if (!$conn->delColumn($newEnum->getId(), $schema, $key)) {
                    throw new EnumException("Hubo un error modificando la columna");
                }
            }
            else if ($oldEnum->getField($key)->getType() != $modType || $modType != 'DB_Enum') {
                if (!$conn->modColumn($newEnum->getId(), $schema, $key, $modType::getDBTypeCreation($newEnum->enumInstance, $connType, $modField->getProperties(), $newEnum), $modField->getHeader()) ||
                    !$conn->setDefaultValueForColumn($newEnum->getId(), $schema, $key, $modType::getDefaultValue($connType, $modField->getProperties()))
                ) {
                    throw new EnumException("Hubo un error modificando la columna");
                }
            }
            else if($modType == 'DB_Enum'){
                $oldMulti = ($oldType== 'DB_Enum' && $oldProps['multiSelection']);
                $modMulti = ($modType == 'DB_Enum' && $modProps['multiSelection']);
                $oldEnum2 = $enums->getEnum($oldProps['_enum']);
                $modEnum2 = $enums->getEnum($modProps['_enum']);

                if($oldMulti === $modMulti && $oldProps['_enum'] == $modProps['_enum']){
                    continue;
                }
                if($oldMulti) {
                    $oldType::removeMultiTable($oldEnum, $oldEnum2, $conn);
                }
                else if (!$conn->delColumn($newEnum->getId(), $schema, $key)) {
                    throw new EnumException("Hubo un error modificando la columna");
                }
                if($modMulti){
                    $modType::createMultiTable($newEnum, $modEnum2, $conn);
                }
                else if(!$conn->addColumn($newEnum->getId(), $schema, $key, $modType::getDBTypeCreation($newEnum->enumInstance, $connType, $modField->getProperties(), $newEnum), $modField->getHeader()) ||
                    !$conn->setDefaultValueForColumn($newEnum->getId(), $schema, $key, $modType::getDefaultValue($connType, $modField->getProperties()))
                ) {
                    throw new EnumException("Hubo un error modificando la columna");
                }

            }
        }
        //del fields
        foreach ($changes['del'] as $key => $value) {
            $field = $oldEnum->getField($value);
            $props = $field->getProperties();
            $type = $field->getType();

            if (!$type::savedInBD()) {
                continue;
            }
            if($type == 'DB_Enum' && $props['multiSelection']){
                $type::removeMultiTable($newEnum,$enums->getEnum($props['_enum']), $conn);
            }
            else if (!$conn->delColumn($newEnum->getId(), $schema, $key)) {
                throw new EnumException("Hubo un error borrando la columna");
            }
        }
        $conn->commitTransaction();

        $refs = Refs::getInstance($enumInstance);
        //adicionar referencias.
        $refs->addRefs($changes['addRefs']);

        //eliminar referencias
        $refs->delRefs($changes['delRefs']);

        $enums->modEnum($newEnum);

        $refs->saveRefs();
        $enums->saveEnums();

        $actionsM->callPostEnumModActions( $newEnum);
    }


    public static function addEnum($enumInstance, $enumTree, $enumTreePath, $refs)
    {
        $actionsM = ActionManager::getInstance($enumInstance);
        $enums = Enums::getInstance($enumInstance);
        $simpleTree = SimpleTree::getInstance($enumInstance);


        $enum = new Enum($enumInstance,$enumTree, $enums);

        //verificar si ya existe el enum a anhadir.
        if ($enums->exists($enum)) {
            throw new EnumException( 'Mientras usted anhadia el nomenclador, el mismo ya fue anhadido por otra
            person.');
        }
        $actionsM->callPreEnumAddActions($enum);

        //anhadir $enum al arreglo de enums guardado en enums.json
        $enums->addEnum($enum);

        //anhadir la posicion que le toca a $enum en simpleTree.json
        $simpleTree->addEnum($enumTreePath);

        if (!$enums->validateEnum($enumInstance, $enum)) {
            throw new EnumException('Se han modificado los nomencladores mientras usted creaba el suyo, lo que
            llevo a que se creen iconsistencias si este nomenclador es adicionado, vuelva a crearlo.');
        }

        //agregar una nueva tabla a la base de datos que guarde los datos de este enum.
        if ($enum->createEnumInDS()) {
            //solo guardar los enums cuando se pueda crear la tabla del enum.
            $enums->saveEnums();
            $references = Refs::getInstance($enumInstance);
            $references->addRefs($refs);
            $references->saveRefs();
            $simpleTree->saveSimpleTree($enumInstance);

            $actionsM->callPostEnumAddActions($enum);
        }
    }

    public static function submitChanges($enumInstance, $enum, $data)
    {
        if (!$data) {
            return;
        }
        $enums = Enums::getInstance($enumInstance);
        $enum2 = new Enum($enumInstance,$enum, null);
        $enum = $enums->getEnum($enum);
        $actionsM = ActionManager::getInstance($enumInstance);

        if (!Enum::enumEquals($enum, $enum2)) {
            throw new EnumException("Recargue los nomencladores, el nomenclador que estas modificando ha cambiado.");
        }

        $conn = EnumsUtils::getDBConnection($enum);
        $error = array();
        $msg = '';
        $addedData = null;

        $actionsM->callPreSubmitActionsForEnum($enum,$data);


        //$conn->beginTransaction();
        // insertar los nuevos
        if (count($data['add']) > 0) {

            $addData = $enum->getValueArrayToDb($data['add']);
            $fieldsOrder = $enum->getFieldsOrder(reset($data['add']));
            if(!$conn->insertData($enum->getId(), $fieldsOrder, $enum->getDataSource()->getSchema(), $addData, true)){
                throw new EnumException($conn->getLastError());
            }
            $addedData = $conn->fetchData(false);
            foreach ($enum->getFields() as $value){
                $field = new Field($value);
                $type = $field->getType();
                $props = $field->getProperties();
                if($type =='DB_Enum' && $props['multiSelection']){
                    $enum_ref = $enums->getEnum($props['_enum']);
                    $multiTable = DB_Enum::getMultiTableName($enum, $enum_ref);
                    $data = $enum->getMultiValueField($data['add'],$field->getId(),$addedData);
                    if(!$conn->insertData($multiTable,array($enum->getId(),$enum_ref->getId()),$enum->getDataSource()->getSchema(),$data)) {
                        throw new EnumException($conn->getLastError());
                    }
                }
            }

            $actionsM->callPostAddActions($enum,$enum->getValueArrayFromDb($addedData));
        }



        //modificar
        if (count($data['mod']) > 0) {
            $updateData = array();
            $c = 0;
            foreach ($data['mod'] as $recordId => $record) {
                $updateData[$recordId] = array();
                $lastRecord = $data['mod'][$recordId]['last'];

                foreach ($record['modified'] as $fieldId => $fieldValue) {
                    $field = $enum->getField($fieldId);
                    $type = $field->getType();
                    $props = $field->getProperties();
                    if($type == 'DB_Enum' && $props['multiSelection']){
                        $pId = $lastRecord[PrimaryKey::ID];
                        $multiTable = DB_Enum::getMultiTableName($enum, $enums->getEnum($props['_enum']));
                        $conn->deleteData($multiTable, $enum->getDataSource()->getSchema(), array($enum->getId()=>$pId),$enum->getId());
                        $conn->insertData($multiTable, array($enum->getId(), $enums->getEnum($props['_enum'])->getId()),
                            $enum->getDataSource()->getSchema(),$enum->getMultiValueFieldFromMod($lastRecord[$fieldId], $lastRecord[PrimaryKey::ID]));
                    }
                    else {
                        $updateData[$recordId][$fieldId] = $lastRecord[$fieldId];
                        $c++;
                    }
                }
                foreach ($record['last'] as $fieldId => $fieldValue) {
                    if (strstr($fieldId, BaseType::REF_VALUE_ID)) {
                        $updateData[$recordId][$fieldId] = $fieldValue;
                    }
                }
                $updateData[$recordId][PrimaryKey::ID] = $lastRecord[PrimaryKey::ID];
            }

            $updateData = $enum->getValueArrayToDb($updateData);
            if ($c != 0 && !$conn->updateData($enum->getId(), $enum->getDataSource()->getSchema(), $updateData)) {
                throw new EnumException($conn->getLastError());
            }
            $data = $conn->fetchData(false);

            $actionsM->callPostModActions($enum,$enum->getValueArrayFromDb($data));
        }

        //eliminar
        if (count($data['del']) > 0) {
            $msg = $enum->canDeleteData($data['del']);
            if (!$msg) {
                $delData = $enum->getValueArrayToDb($data['del']);
                if (!$conn->deleteData($enum->getId(), $enum->getDataSource()->getSchema(), $delData)) {
                    throw new EnumException($conn->getLastError());
                }
                foreach($enum->getFields() as $f){
                    $field = new Field($f);
                    $type = $field->getType();
                    $props = $field->getProperties();
                    if($type=='DB_Enum' && $props['multiSelection']){
                        $multiTable = DB_Enum::getMultiTableName($enum, $enums->getEnum($props['_enum']));
                        $toDel = $enum->getIdsToRemoveMulti($data['del'], $enum->getId());
                        $conn->deleteData($multiTable, $enum->getDataSource()->getSchema(),$toDel, $enum->getId());
                    }
                }
            }
        }

        //$conn->commitTransaction();


        return array('delMsg' => $msg, 'add'=>$addedData);
    }

    public static function removeEnum($enumInstance, $enumId, $path)
    {
        $actionsM = ActionManager::getInstance($enumInstance);

        $enums = Enums::getInstance($enumInstance);
        $_enum = $enums->getEnum($enumId);
        $simpleTree = SimpleTree::getInstance($enumInstance);

        $r = $_enum->getCanBeDeletedMessage();
        if(is_string($r))
            throw new EnumCantBeRemovedIsRefException($_enum->getId(), $_enum->getName(), $r);


        $actionsM->callPreEnumRemActions( $_enum);

        $simpleTree->removeTreeNode($path);

        $_enum->remove();

        EnumsUtils::saveHeaders($enumInstance);

        $actionsM->callPostEnumRemActions( $_enum);
    }

    public static function removeRank($enumInstance, $path)
    {
        $simpleTree = SimpleTree::getInstance($enumInstance);
        $enums = Enums::getInstance($enumInstance);
        $refs = Refs::getInstance($enumInstance);

        try {
            $simpleTree->delRank($path);
            $simpleTree->saveSimpleTree();
            $enums->saveEnums();
            $refs->saveRefs();
        }
        catch (EnumActionRejected $e){
            $simpleTree->saveSimpleTree();
            $enums->saveEnums();
            $refs->saveRefs();
        }
    }
}

class EnumsUtils
{

    //const importPath = CARTOWEB_HOME.'/htdocs/generated/Enums/enumsImport.zip';
    //const exportPath = CARTOWEB_HOME.'/htdocs/generated/Enums/enumsExport.zip';

    public static $pluginPath;

    public static function getConfPath($extra)
    {

        if (EnumsUtils::$pluginPath == null) {
//            $arr = explode('/', __DIR__);
//            array_pop($arr);
//            EnumsUtils::$pluginPath = implode('/',$arr);


            $projectH = ServerContext::getInstance()->getProjectHandler();

            $dir = CARTOWEB_HOME . ProjectHandler::PROJECT_DIR . '/' . $projectH->getProjectName() .
                '/server_conf/' . $projectH->mapName . '/Enums';
            EnumsUtils::$pluginPath = $dir;
            mkdir($dir, 0777);
            chmod($dir, 0777);

        }
        if ($extra != null) {
            return EnumsUtils::$pluginPath . "/$extra";
        }
        return EnumsUtils::$pluginPath;
    }
    public static  function getConn(){
        return ServerNomenclador::getConn();
    }
    public static function getProjectName(){
        return ServerContext::getInstance()->getProjectHandler()->getProjectName();
    }

    public static function getdefaultsConfsPath()
    {
        return dirname(__FILE__) . '/../defaultConfs/';

    }

    public static function getTempPath()
    {
        return CARTOWEB_HOME . 'htdocs/generated/Enums';
    }

    public static function getDBConnection( $enum)
    {
        $dataS = DataSources::getInstance($enum->enumInstance);
        $dataS = $dataS->getSource($enum->getDataSourceName());
        return new DBConnProxy($dataS);
    }

    public static function saveHeaders($enumInstance)
    {
        $enums = Enums::getInstance($enumInstance);
        $enums->saveEnums();

        $refs = Refs::getInstance($enumInstance);
        $refs->saveRefs();

        $simpleTree = SimpleTree::getInstance($enumInstance);
        $simpleTree->saveSimpleTree($enumInstance);

        $dataSource = DataSources::getInstance($enumInstance);
        $dataSource->saveDataSources();
    }

    public static function changeFilesAndDirectoryPermission($path, $mode)
    {
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path), RecursiveIteratorIterator::SELF_FIRST);

        foreach ($iterator as $item) {
            chmod($item, $mode);
        }
    }

    public static function sendFile($path)
    {
        if (!is_file($path))
            return;
        header('Content-Description: File Transfer');
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . basename($path) . '"');
//        header('Content-Encoding: gzip');
        header('Expires: 0');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
        header('Pragma: public');
        header('Content-Length: ' . filesize($path));
        ob_clean();
        flush();
        readfile($path);
        exit;
    }

    public static function saveNewEnumConfigZip($path)
    {

        $tempEnumC = CARTOWEB_HOME . 'htdocs/generated/Enums/enumsImport.zip';
        self::createGeneratedEnums();
        copy($path, $tempEnumC);
        chmod($tempEnumC, 0777);
    }

    public static function createGeneratedEnums()
    {
        $path = CARTOWEB_HOME . 'htdocs/generated';
        mkdir($path, 0777);
        chmod($path, 0777);
        $path = $path . '/Enums';
        mkdir($path, 0777);
        chmod($path, 0777);
    }

    public static function importEnums($enumInstance, $append, $prefixPath)
    {

        $zip = new ZipArchive();
        $zip->open(CARTOWEB_HOME . 'htdocs/generated/Enums/enumsImport.zip');

        $config = json_decode($zip->getFromName('config.json'));

        $path = null;

        if ($append) {

        } else {
            //self::removeAllEnumsConfigs();
        }
        if (isset($config['getEnums'])) {

            $importedEnums = json_decode($zip->getFromName('enums.json'), true);
            $enums = Enums::getInstance($enumInstance);

            $enumsRepeated = self::areAnyKeysRepeated($importedEnums, $enums->enums);
            if (count($enumsRepeated) > 0) {
                $enumsNames = $enums->getEnumsNames($enumsRepeated);
                $enumsNamesStr = '';
                foreach ($enumsNames as $value) {
                    $enumsNamesStr .= $value . ',';
                }
                $enumsNamesStr = substr($enumsNamesStr, 0, -1);
                 throw new EnumException("Los nomencladores:'$enumsNamesStr', est&aacute;n repetidos entre los nomencladores
                   a anhadir y los que estaban antes");
            }
            $dataSources = DataSources::getInstance($enumInstance);
            $importedDataSources = json_decode($zip->getFromName('dataSources.json'), true);
            $importedRefs = json_decode($zip->getFromName('refs.json'), true);
            $importedSimpleTree = json_decode($zip->getFromName('simpleTree.json'), true);

            $dataSources->importDataSources($importedDataSources);
            $enums->addEnums($importedEnums);

            $refs = Refs::getInstance($enumInstance);
            $refs->addImportedRefs($importedRefs);

            $simpleTree = SimpleTree::getInstance($enumInstance);
            $simpleTree->addImportedTree($importedSimpleTree, $prefixPath);

            self::saveHeaders($enumInstance);

        }
    }

    public static function removeAllEnumsConfigs($enumInstance)
    {
        //implementado suponiendo que no hay restriccion entre las tablas.
        $enums = Enums::getInstance($enumInstance);
        $enums->removeAll();

        $dataS = DataSources::getInstance($enumInstance);
        $dataS->removeAll();

        $refs = Refs::getInstance($enumInstance);
        $refs->removeAll();

        $simpleTree = SimpleTree::getInstance($enumInstance);
        $simpleTree->removeAll();

    }

    public static function areAnyKeysRepeated($array1, $array2)
    {

        $keys1 = array_keys($array1);
        $keys2 = array_keys($array2);

        $intersect = array_intersect($keys1, $keys2);
        return $intersect;
    }

    public static function getPublicKey()
    {
        $pathToDefaults = EnumsUtils::getdefaultsConfsPath();
        return file_get_contents($pathToDefaults . 'public_key.pub');
    }

    public static function checkDBresponse($e){
        if($e instanceof DB_Error)
            throw new Exception($e->message);
    }

}

/**
 * Created by PhpStorm.
 * User: mano
 * Date: 11/01/17
 * Time: 8:56
 */
class Enums
{
    public $enums;
    public $enumInstance;

    private function __construct($enumInstance)
    {
//        $p = Enums::getEnumsPath();
//
//        if (!file_exists($p)) {
//            file_put_contents($p, '{}');
//            chmod($p, 0777);
//        }
//        $enums = file_get_contents($p);
        $this->enumInstance = $enumInstance;
        $conn = EnumsUtils::getConn();
        $projName = EnumsUtils::getProjectName();

        $enums = $this->getData($conn);
        if(count($enums) == 0) {
            $defaultV = json_encode($this->getDefaultValue());
            $conn->simpleQuery("insert into mod_nomenclador.enums(v,proj,enum_instance) values ('$defaultV', '$projName', '$enumInstance')");

            $actions = ActionManager::getInstance($this->enumInstance);
            $actions->callInstanceAddingActions($this);
            $enums = $this->getData($conn);
        }
        $enums = reset($enums);
        $enums = json_decode($enums['v'], true);
        $this->enums = $enums;
    }
    private function getData($conn){
        $projName = EnumsUtils::getProjectName();
        $enumInstance = $this->enumInstance;
        $sql = "select * from mod_nomenclador.enums where proj = '$projName' and enum_instance='$enumInstance'";

        $enums = $conn->getAll($sql, null, DB_FETCHMODE_ASSOC);
        EnumsUtils::checkDBresponse($enums);
        return $enums;
    }
    public function getDefaultValue(){
        return array();
    }
    public static $instance = array();

    public static function getInstance($enumInstance)
    {
        if(!$enumInstance)
            throw new Exception();
        if (!array_key_exists($enumInstance, self::$instance)) {
            self::$instance[$enumInstance] = new Enums($enumInstance);
        }
        return self::$instance[$enumInstance];
    }
    public static function InstanceExist($enumInstance){
        $conn = EnumsUtils::getConn();
        $projName = EnumsUtils::getProjectName();
        $sql = "select exists(select * from mod_nomenclador.enums where enum_instance = '$enumInstance' and proj ='$projName' ) as e";
        $data = $conn->getAll($sql, DB_FETCHMODE_ASSOC);
        $data = reset($data);
        return $data['e']==='t';
    }
    public static function AddEnumsToDb($enumInstance, $enums){
        $enums = self::getInstance($enumInstance);
        $enums->addEnums($enums);
        $enums->saveEnums();
    }

    public static function getEnumsPath()
    {
        return EnumsUtils::getConfPath('enums.json');
    }

    /**
     * @param $enum Enum|string
     * @return Enum  Enum
     * @throws EnumException
     */
    public function getEnum($enum)
    {
        $id = is_string($enum)? $enum:$enum['id'];
        if(!isset($this->enums[$id])){
            throw new EnumException("El nomenclador no existe");
        }
        return new Enum($this->enumInstance,$this->enums[$id], $this);
    }

    public function addEnum($enum)
    {
        $this->enums[$enum->getId()] = $enum->enum_tree;
    }

    public function count()
    {
        return count($this->enums);
    }

    public function addEnums($enumsTree)
    {

        foreach ($enumsTree as $enum) {
            $this->enums[$enum['id']] = $enum;
            $e = $this->getEnum($enum);
            $e->createEnumInDS();
        }

    }

    public function modEnum($enum)
    {
        $this->enums[$enum->getId()] = $enum->enum_tree;
    }

    public function delEnum($enum)
    {
        unset($this->enums[$enum->getId()]);
    }

    public function getEnums()
    {
        $r = array();
        foreach ($this->enums as $key => $value) {
            $r[] = $key;
        }
        return $r;
    }

    public function getEnumsNames($keys)
    {
        $names = array();
        foreach ($keys as $value) {
            $names[] = $this->enums[$value]['name'];
        }
        return $names;
    }

    public function saveEnums()
    {
//        $p = Enums::getEnumsPath();
//        file_put_contents($p, json_encode($this->enums));

        $conn = EnumsUtils::getConn();
        $projName = EnumsUtils::getProjectName();
        $data = json_encode($this->enums);

        $sql = "update mod_nomenclador.enums set v='$data' where proj= '$projName' and enum_instance = '{$this->enumInstance}'";
        $conn->simpleQuery($sql);
    }

    /**
     * Valida el nomenclador que se va a insertar, de tal manera que cuando se inserte no hayan inconsistencias
     * @param $enum {Object}     Nomenclador a validar
     * @return {boolean}
     */
    public function validateEnum($enumInstance, $enum)
    {
        //Inconsistencias:
        //   No exista el campo ni el nomenclador referenciado por este.
        //   Si este nomenclador se esta modificando, se puede crear un ciclo infinito
        //   Otro nomenclador tenga el mismo nombre del q se esta adicionando.


        foreach ($enum->getFields() as $value) {
            $field = new Field($value);
            $type = $field->getType();
            if ($type == 'DB_Enum') {
                //ver que siempre se referencia a un valor es una solucion para los 2 problemas.
                if (Enums::verifyIsLooped($enumInstance, $enum, $field)) {
                    return false;
                }
            }
            if ($type::dependsOnOtherFields($this, $field)) {
                $type::validateDependencies($enumInstance,$enum, $field);
            }
        }
        //
        $enums = Enums::getInstance($enumInstance);
        foreach ($enums->getEnums() as $key){
            $enum2 = $enums->getEnum($key);
            if($enum->getName() == $enum2->getName() && $enum->getId() != $enum2->getId())
                throw new EnumException('Este nomenclador ya fue creado por otra persona, por favor recargue el &aacute;rbol de nomencladores.');
        }
        return true;
    }

    public function verifyIsLooped($enumInstance, $enum, $field)
    {

        $enums = Enums::getInstance($enumInstance);

        $currentEnum = $enum;
        $currentField = $field;
        $visited = array($currentEnum->getId() . $currentField->getId() => 1);

        while ($currentField->getValueType() == BaseType::REF) {

            $prop = $currentField->getProperties();
            $currentEnum = $enums->getEnum($prop['_enum']);
            if (!$currentEnum->exists())
                return false;
            $currentField = $currentEnum->getField($prop['field']);
            if (!$currentField->exists())
                return false;

            if (isset($visited[$currentEnum->getId() . $currentField->getId()])) {
                return true;
            }
            $visited[$currentEnum->getId() . $currentField->getId()] = 1;
        }
        return false;
    }

    public function exists($enum)
    {
        return isset($this->enums[$enum->getId()]) ? $this->enums[$enum->getId()] : null;
    }

    public function removeAll()
    {
        foreach ($this->enums as $key => $value) {
            $enum = $this->getEnum($key);
            $enum->remove();
            unset($this->enums[$key]);
        }
        $this->saveEnums();
    }

    public function export($config)
    {

        $path = EnumsUtils::getTempPath();

        EnumsUtils::createGeneratedEnums();

        $zipPath = $path . '/enumsExport.zip';
        unlink($zipPath);

        $zip = new ZipArchive();
        if (!$zip->open($zipPath, ZipArchive::CREATE)) {
            throw new EnumException('No se pudo crear el archivo zip.');
        }
        file_put_contents($path . '/config', json_encode($config));
        chmod($path . '/config', 0777);
        if (!$zip->addFile($path . '/config', 'config.json')) {
            throw new EnumException('No se pudo adicionar un archivo al zip.');
        }

        if (isset($config['getEnums'])) {
            if (!$zip->addFile(Enums::getEnumsPath(), 'enums.json') ||
                !$zip->addFile(DataSources::getPathToExportItem($this->enumInstance), 'dataSources.json') ||
                !$zip->addFile(Refs::getRefsPath(), 'refs.json') ||
                !$zip->addFile(SimpleTree::getPathToExportItem(), 'simpleTree.json')
            ) {
               throw new EnumException('No se pudo adicionar un archivo al zip.');
            }

        }
        $zip->close();
        chmod($zipPath, 0777);
        return 'generated/Enums/enumsExport.zip';

        //EnumsUtils::sendFile($zipPath);

    }
}
