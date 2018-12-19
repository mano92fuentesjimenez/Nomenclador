<?php
/**
 * Created by PhpStorm.
 * User: mano
 * Date: 11/25/18
 * Time: 8:17 PM
 */

class Enums
{
    public $enums;
    public $enumInstance;

    private $deletedEnum;

    private function __construct($enumInstance)
    {
//        $p = Enums::getEnumsPath();
//
//        if (!file_exists($p)) {
//            file_put_contents($p, '{}');
//            chmod($p, 0777);
//        }
//        $enums = file_get_contents($p);
        $this->deletedEnum = array();
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

    /**
     * @param $enumInstance
     * @return Enums
     * @throws Exception
     */
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
    public static function AddEnumsToDb($enumInstance, $enums_){
        $enums = self::getInstance($enumInstance);
        $enums->addEnums($enums_);
        $enums->saveEnums();
    }

    public static function getEnumsPath()
    {
        return EnumsUtils::getConfPath('enums.json');
    }

    private function validateId($enum){
        $id = is_string($enum)? $enum:$enum['id'];
        if(!isset($this->enums[$id])){
            throw new EnumNotExist($id, $this->enumInstance);
        }
        return $id;
    }

    /**
     * @param $enum Enum|string
     * @return Enum  Enum
     * @throws EnumException
     */
    public function getEnum($enum)
    {
        return new Enum($this->enumInstance,$this->enums[$this->validateId($enum)], $this);
    }

    /**
     * @param $enum
     * @return EnumStore
     * @throws EnumException
     */
    public function getEnumStore($enum){
        return new EnumStore($this->enumInstance,$this->enums[$this->validateId($enum)], $this);
    }

    /**
     * @param $enum
     * @return EnumQuerier
     * @throws EnumException
     */
    public function getEnumQuerier($enum){
        return new EnumQuerier($this->enumInstance,$this->enums[$this->validateId($enum)], $this);
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
            $e = $e->getEnumStore();
            $e->createEnumInDS();
        }

    }

    public function modEnum(Enum $enum)
    {
        $this->enums[$enum->getId()] = &$enum->enum_tree;
        $enum->incrementModelRevision();
    }

    public function delEnum($enum)
    {
        $this->deletedEnum[] = $enum->getId();
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

        foreach ($this->deletedEnum as $value){
            unset($this->enums[$value]);
        }

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
        $this->verifyCircularDependencies($enum);
        //
        $enums = Enums::getInstance($enumInstance);
        foreach ($enums->getEnums() as $key){
            $enum2 = $enums->getEnum($key);
            if($enum->getName() == $enum2->getName() && $enum->getId() != $enum2->getId())
                throw new EnumException('Este nomenclador ya fue creado por otra persona, por favor recargue el &aacute;rbol de nomencladores.');
        }
        return true;
    }
    public function verifyCircularDependencies(Enum $enum){
        $refs = Refs::getInstance($enum->enumInstance);
        $refsArr = $refs->getReferencesToEnum($enum);

        foreach ($refsArr as $enumField => $references){
            foreach ($references as $hash => $fieldId){
                $enumId = $refs->getEnum($hash);
                if(count($enum->getFieldsByType('DB_Enum','_enum',$enumId)) > 0){
                    throw new InvalidModel("El nomenclador {$enum->getId()} tiene referencia circular con {$enumId}, por tanto no pudo ser creado");
                }

            }
        }

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
            $enum = $this->getEnumStore($key);
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