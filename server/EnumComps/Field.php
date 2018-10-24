<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:23
 */

class Field
{
    public $field_tree;

    public function __construct(&$field_tree)
    {
        $this->field_tree = is_array($field_tree) ? $field_tree : array();
    }

    public function getId()
    {
        return $this->field_tree['id'];
    }

    public function getHeader()
    {
        return isset($this->field_tree['header']) ? $this->field_tree['header'] : null;
    }

    public function getType()
    {
        $tree = $this->field_tree;
        return array_key_exists('integrationProperty',$tree) ? 'DB_Integration' :  $tree['type'];
    }

    public function getValueType()
    {

        $r = $this->getType();
        return $r::getValueType();
    }

    public function getProperties()
    {
        return isset($this->field_tree['properties']) ? $this->field_tree['properties'] : null;
    }

    public function exists()
    {
        return $this->field_tree != null;
    }

    public function getEnumId()
    {
        return $this->field_tree['_enumId'];
    }

    public function getDependencies()
    {
        if( isset($this->field_tree['properties']['dependencies']))
            return $this->field_tree['properties']['dependencies'];
        return null;
    }

    public function getDependenciesArray()
    {
        return $this->getDependencies();
    }

    public function getIntegrationProperty()
    {
        return isset($this->field_tree['integrationProperty'])? $this->field_tree['integrationProperty']:null;

    }
    public function getNeeded(){
        return isset($this->field_tree['needed']) ? $this->field_tree['needed'] : null;
    }
    public function isMulti(){
        $prop = $this->getProperties();
        if(isset($prop['multiSelection'])){
            $prop = $this->getProperties();
            return (isset($prop['multiSelection']) ? $prop['multiSelection'] : false);
        }
        return false;
    }
    public function isEnum(){
        return $this->getType() == 'DB_Enum';
    }
}