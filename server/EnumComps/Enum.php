<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:23
 */
class Enum
{
    public $enum_tree;
    /**
     * @var $enums Enums
     */
    protected $enums;
    public $enumInstance;

    public function __construct($enumInstance, &$enum_tree, $enums)
    {
        $this->enumInstance = $enumInstance;
        $this->enum_tree = &$enum_tree;
        $this->enums = isset($enums) ? $enums : null;
        $this->actions = null;
        if(isset($enums)) {
            $this->addRevisionField();
        }
    }

    public function saveEnum()
    {
        $this->enums->saveEnums();
    }

    public function getId()
    {
        return $this->enum_tree['id'];
    }

    public function getName()
    {
        return $this->enum_tree['name'];
    }

    public function getDataSourceName()
    {
        return $this->enum_tree['dataSource'];
    }

    public function getDataSource()
    {
        return new DataSource($this->enumInstance, $this->enum_tree['dataSource']);
    }

    public function getDefaulField()
    {
        return new Field($this->enum_tree['fields'][$this->getDefaultFieldId()]);
    }

    public function getDefaultFieldId()
    {
        return $this->enum_tree['denomField'];
    }

    public function getTemplate(){
        return $this->enum_tree['tpl'];
    }

    public function getRevisionField(){
        return $this->getField(Revision::ID);
    }
    public function checkModelRevision(){
        if(!isset($this->enum_tree['modelRevision']))
            $this->enum_tree['modelRevision'] = 0;
    }
    public function getModelRevision(){
        $this->checkModelRevision();
        return $this->enum_tree['modelRevision'];
    }
    public function incrementModelRevision(){
        $this->checkModelRevision();
        $this->enum_tree['modelRevision']++;
    }
    public function checkDataRevision(){
        if(!isset($this->enum_tree['dataRevision']))
            $this->enum_tree['dataRevision'] = 0;
    }
    public function incrementDataRevision(){
        $this->checkDataRevision();
        $this->enum_tree['dataRevision']++;
    }
    public function getDataRevision(){
        $this->checkDataRevision();
        return $this->enum_tree['dataRevision'];
    }
    public function addRevisionField(){
        if(!is_null($this->getRevisionField()) ){
            return;
        }
        $this->enum_tree['fields'][Revision::ID]=array(
            'id'=>Revision::ID,
            'type'=>'Revision'
        );
        $this->saveEnum();
        $conn = $this->getConnection();
        $conn->addColumn($this->getRawTableName(),$this->getRawSchemaName(),Revision::ID,Revision::getDBTypeCreation($this->enumInstance,$this->getDataSource()->getDataSourceType()),'Campo Revision');
    }
    public function getConnection(){
        return EnumsUtils::getDBConnection($this);
    }

    public function getEnumStore(){
        return new EnumStore($this->enumInstance, $this->enum_tree, $this->enums);
    }

    public function getEnumQuerier(){
        return new EnumQuerier($this->enumInstance, $this->enum_tree, $this->enums);
    }



    public function getRawTableName(){
        return $this->getId();
    }
    public function getRawSchemaName(){
        return $this->getDataSource()->getSchema();
    }
    public function getTableName($includeSchema=true, $schemaPrefix='', $tablePrefix=''){
        $d = $this->getDataSource();
        return ($includeSchema ? "\"{$schemaPrefix}{$d->getSchema()}\"." : '')."\"{$tablePrefix}{$this->getRawTableName()}\"";
    }
    public function getDataBaseName(){
        return $this->getDataSource()->getDataBaseName();
    }
    public function getPrimaryKeyName(){
        return PrimaryKey::ID;
    }

    public static function sortFields($a,$b){
        $fieldA = new Field($a);
        $fieldB = new Field($b);
        return ($fieldA->getOrderValue() < $fieldB->getOrderValue()) ? -1 :1;
    }
    public function getFieldsOrder($data)
    {
        $arr = array();
        uasort($data,'Enum::sortFields');
        foreach ($data as $key => $value) {
            $field = $this->getField($key);
            $props = $field->getProperties();
            $type = $field->getType();
            if (!$type::savedInBD() ||( $type =='DB_Enum' && $props['multiSelection'])) {
                continue;
            }
            $arr[] = $key;
        }
        return $arr;
    }

    public function &getFields()
    {
        return $this->enum_tree['fields'];
    }

    public function getField($fieldId)
    {
        if ( isset($this->enum_tree['fields'][$fieldId])) {
            return new Field( $this->enum_tree['fields'][$fieldId]);
        }
        return null;
    }



    public function exists()
    {
        return $this->enum_tree != null;
    }

    public static function enumEquals($enum1, $enum2)
    {
        if (!is_array($enum1)) {
            $enum1 = $enum1->enum_tree;
        }
        if (!is_array($enum2)) {
            $enum2 = $enum2->enum_tree;
        }
        $ret = true;
//        $ret  =$enum1['name'] == $enum2['name'];
//        $ret &=$enum1['description'] == $enum2['description'];

        $ret &= $enum1['modelRevision'] == $enum2['modelRevision'];

        $ret &= count($enum1['fields']) == count($enum2['fields']);

        foreach ($enum1['fields'] as $key => $value) {
            $field = new Field($value);
            $field2 = new Field($enum2['fields'][$key]);
            $type= $field->getType();
            $ret &= $type == $field2->getType();
            $ret &= $field->getHeader() == $field2->getHeader();
            $ret &= $field->getId() == $field2->getId();
            $ret &= $field->getNeeded() == $field2->getNeeded();

            if ($field->getProperties()) {
                if (!$field2->getProperties())
                    return false;
                $ret &= $type::compareProperties($field->getProperties(), $field2->getProperties());
            }
        }
        return $ret;
    }
}