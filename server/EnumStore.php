<?php
/**
 * Created by PhpStorm.
 * User: mano
 * Date: 11/25/18
 * Time: 8:25 PM
 */
require_once 'EnumComps/Enum.php';
class EnumStore extends Enum
{


    public function createEnumInDS()
    {
        $enums = Enums::getInstance($this->enumInstance);
        $conn = EnumsUtils::getDBConnection($this);

        if (!$conn->createTable($this->getId(), $this->getDataSource()->getSchema(),
            $this->getFieldArrayFromEnum())
        ) {
            throw new EnumException($conn->getLastError());
        }

        foreach ($this->getFields() as $v){
            $field = new Field($v);
            $type = $field->getType();
            $prop = $field->getProperties();

            if($type == 'DB_Enum' && $prop['multiSelection']){
                $type::createMultiTable($this, $enums->getEnum($prop['_enum']), $conn);
            }
        }

        return true;
    }

    /**
     * Devuelve un arreglo de campos de acorde al tipo de dataSource que tenga el nomenclador.
     * Este arreglo es el que se usa para inicializar un tipo de fuente de datos.
     * @return array
     */
    public function getFieldArrayFromEnum()
    {
        $arr = Array();
        $connTypeStr = $this->getDataSource()->getDataSourceType();

        foreach ($this->getFields() as $field) {
            $field = new Field($field);
            $insert = Array('id' => $field->getId());
            $type = $field->getType();
            $prop = $field->getProperties();

            if (!$type::savedInBD() ||( $type == 'DB_Enum' && $prop['multiSelection']))
                continue;
            $insert['type'] = $type::getDBTypeCreation($this->enumInstance, $connTypeStr, $prop, $this);
            $insert['default'] = $type::getDefaultValue($connTypeStr, $prop);
            $insert['comm'] = $field->getHeader();
            $arr[] = $insert;
        }
        return $arr;
    }

    public function canBeDeleted()
    {
        $r = Refs::getInstance($this->enumInstance);
        $refs = $r->getReferencesToEnum($this);

        return $refs != true;
    }
    public function remove()
    {
        try {
            $conn = EnumsUtils::getDBConnection($this);
            $conn->removeTable($this->getId(), $this->getDataSource()->getSchema());
        }
        catch (EnumDBNotExistException $e){

        }
        $this->removeMultiFieldsTables();
        $refs = Refs::getInstance($this->enumInstance);
        $refs->deleteReferencesFrom($this);

        $enums = Enums::getInstance($this->enumInstance);
        $enums->delEnum($this);
    }
    public function removeMultiFieldsTables(){
        $fields = $this->getFields();
        $conn = EnumsUtils::getDBConnection($this);
        $enums = Enums::getInstance($this->enumInstance);

        foreach ($fields as $value){
            $field = new Field($value);
            $type = $field->getType();
            $props = $field->getProperties();

            if($type =='DB_Enum' && $props['multiSelection']){
                $type::removeMultiTable($this, $enums->getEnum($props['_enum']), $conn);
            }
        }
    }
    public function getCanBeDeletedMessage(){
        $r = Refs::getInstance($this->enumInstance);
        $refs = $r->getReferencesToEnum($this);
        if($refs) {
            $ret = 'El nomenclador ' . $this->getName() . ' no se puede eliminar, esta referenciado por:';
            foreach ($refs as $values) {
                foreach ($values as $from => $boolean) {
                    $splited = explode(':', $from);
                    $ret .= 'el campo:' . $this->enums->getEnum($splited[0])->getField($splited[1])->getHeader();
                    $ret .= ' del nomenclador:' . $this->enums->getEnum($splited[0])->getName(). ', ';
                }
            }
            return substr($ret, 0, -2);
        }
        return null;
    }

    public function delOnCascade($enumInstance)
    {

        $enumId = $this->getId();
        $enums = Enums::getInstance($this->enumInstance);
        $refs = Refs::getInstance($this->enumInstance);
        $visitedEnums = array($enumId => $enumId);
        $enum = $enums->getEnum($enumId);

        $referencesToProcess = array($refs->getReferencesToEnum($enum));
        while (count($referencesToProcess) > 0) {
            $toProcess = array_pop($referencesToProcess);
            if(is_array($toProcess)) {
                foreach ($toProcess as $key => $references) {
                    foreach ($references as $enumField => $boolean) {
                        $nextEnumId = Refs::getEnum($enumField);
                        if (!isset($visitedEnums[$nextEnumId])) {
                            $visitedEnums[$nextEnumId] = $nextEnumId;
                            $enum = $enums->getEnum($nextEnumId);
                            array_push($referencesToProcess, $refs->getReferencesToEnum($enum));
                        }

                    }
                }
            }
        }

        $simpleTree = SimpleTree::getInstance($enumInstance);
        $simpleTree->removeEnumsInArray($visitedEnums);

        foreach ($visitedEnums as $value) {
            $enum = $enums->getEnumStore($value);
            $enum->remove();
        }
        EnumsUtils::saveHeaders($enumInstance);
    }



    public function canDeleteFields($fields)
    {
        $refs = Refs::getInstance($this->enumInstance);
        $enums = Enums::getInstance($this->enumInstance);
        foreach ($fields as $key => $value) {
            $f = $this->getField($key);
            $r = $refs->getReferencesTo($f->getId(), $this->getId());
            if (count($r) > 0) {
                $error = array('ERROR' => 'El campo ' . $f->getHeader() . ' no se puede modificar ni eliminar, esta referenciado por:');

                foreach ($r as $ref => $b) {
                    $e = $enums->getEnum($refs->getEnum($ref));
                    $f2 = $e->getField($refs->getField($ref));
                    $error['ERROR'] .= ' el campo ' . $f2->getHeader() . ' del nomenclador ' . $e->getName() . ',';
                }
                $error['ERROR'] = substr($error['ERROR'], 0, -1) . '.';
                throw new EnumException($error['ERROR']);
            }


        }
    }

    public function canModifyFields($fields)
    {
        $refs = Refs::getInstance($this->enumInstance);
        $enums = Enums::getInstance($this->enumInstance);
        foreach ($fields as $key => $value) {
            $f = $this->getField($key);
            $newField = new Field($value);
            $r = $refs->getReferencesTo($f->getId(), $this->getId());
            if (count($r) > 0) {
                foreach ($r as $ref => $b) {
                    $nextEnum = $enums->getEnum($refs->getEnum($ref));
                    $fieldReferencing = $nextEnum->getField($refs->getField($ref));

                    //Verifico que las referencias al campo que se modifican no sean las dependencias de alguna formula
                    foreach ($nextEnum->getFields() as $field) {
                        $field = new Field($field);
                        $type = $field->getType();
                        if ($type::dependsOnOtherFields($nextEnum, $field) && $type::dependsOn($nextEnum, $field, $fieldReferencing)
                            && !$type::canChangeTo($nextEnum, $field,$f->getType(), $newField->getType())
                        ) {
                            throw new EnumException('El campo: ' . $f->getHeader() . ' no puede ser modificado, pues esta'
                                . 'referenciado por el campo: ' . $fieldReferencing->getHeader() . ' del nomenclador: ' . $nextEnum->getName()
                                . ' que es dependencia de la columna ' . $field->getHeader() . '. Solo acepta los tipos:' . $type::getAcceptedTypes($nextEnum, $field) . '.');
                        }

                    }

                }
            }


        }
    }

    public function hasData()
    {
        $conn = EnumsUtils::getDBConnection($this);
        $conn->countRows($this->getId(), $this->getDataSource()->getSchema());
        $v = reset($conn->fetchData());
        return $v['count'];
    }
}