<?php

include_once "Types/BaseType.php";
include_once "DBConections/DBConection.php";
include_once 'Exceptions.php';

require_once 'EnumQuerier.php';
require_once 'EnumStore.php';
require_once 'RecordsManipulator.php';

require_once 'EnumComps/DataSources.php';
require_once 'EnumComps/DefaultFields.php';
require_once 'EnumComps/Enum.php';
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
        $oldEnum = $enums->getEnumStore($changes['_enum']['id']);

        $newEnum = new Enum($enumInstance,$changes['_enum'], $enums);
        $actionsM->callPreEnumModActions($newEnum);

        //Se tiene que verificar que el nomenclador que se esta modificando, es la ultima modificacion del mismo
        //o sea comparar si son iguales el nomenclador en el server y el nomenclador sin modificar en el cliente.
        if (!$oldEnum->enumEquals($newEnum)) {
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
        $enum = $enum->getEnumStore();

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




    public static function submitChanges($enumInstance, $modelId, $modelRevision, $data)
    {
        $enums = Enums::getInstance($enumInstance);
        $enum = $enums->getEnumStore($modelId);
        return $enum->submitChanges($enumInstance,$modelRevision, $data);
    }

    public static function removeEnum($enumInstance, $enumId, $path)
    {
        $actionsM = ActionManager::getInstance($enumInstance);

        $enums = Enums::getInstance($enumInstance);
        $_enum = $enums->getEnumStore($enumId);
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

