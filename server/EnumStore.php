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

    /**Convierte los valores de data, que tienen el tipo de dato del cliente, al tipo de dato que se va a guardar en
     * la fuente de datos que posee este enum.
     * @param $data {array}     Arreglo con los valores a guardar
     * @return array
     */
    public function getValueArrayToDb($data)
    {
        $connTypeStr = $this->getDataSource()->getDataSourceType();
        $arr = array();
        foreach ($data as $values) {
            $record = array();

            foreach ($values as $fieldId => $value) {
                $field = $this->getField($fieldId);
                if(!isset($field)) continue;
                $type = $field->getType();
                $props = $field->getProperties();
                if (!$field || !$type::savedInBD() || ($type == 'DB_Enum' && $props['multiSelection'])){
                    continue;
                }
                $type = $field->getType();
                $record[$fieldId] = $type::getValueToDB($values, $value, $field, $connTypeStr, $this->enumInstance);
            }
            if(count($record) === 0)
                continue;
            $arr[] = $record;
        }
        return $arr;
    }
    public function submitChanges($enumInstance, $modelRevision, $data)
    {
        if (!$data) {
            return array();
        }
        $enums = Enums::getInstance($enumInstance);
        $actionsM = ActionManager::getInstance($enumInstance);

        if (!$this->sameRevision($modelRevision)) {
            throw new EnumException("Recargue los nomencladores, el nomenclador que estas modificando ha cambiado.");
        }

        $underRevision = array();
        $msg = '';
        $addedData = null;

        $actionsM->callPreSubmitActionsForEnum($this, $data);

        $addedData = $this->addRecords($data['add']);

        $modOut = $this->modRecords($data['mod']);
        if (is_array($modOut))
            $underRevision = array_merge($underRevision, $modOut['underRevision']);

        $val = $this->delRecords($data['del']);
        if (is_string($val))
            $msg = $val;
        else if (is_array($val)) {
            $underRevision = array_merge($underRevision, $val);
        }
        $this->incrementDataRevision();
        $enums->saveEnums();

        return array('delMsg' => $msg, 'add' => $addedData, 'underRevision' => $underRevision,'modified'=>$modOut['modified']);
    }
    private function isData($data)
    {
        return is_array($data) && count($data) !==0;
    }
    public function addRecords($data){
        if(!$this->isData($data))
            return null;

        $conn = $this->getConnection();
        $actionsM = ActionManager::getInstance($this->enumInstance);

        $addData = $this->getValueArrayToDb($data);
        $fieldsOrder = $this->getFieldsOrder(reset($data));
        if(!$conn->insertData($this->getId(), $fieldsOrder, $this->getDataSource()->getSchema(), $addData, true)){
            throw new EnumException($conn->getLastError(),500);
        }
        $enumQ = $this->getEnumQuerier();
        $addedData = $conn->fetchData(false);
        $addedData = $enumQ->getValueArrayFromDb($addedData);
        foreach ($this->getFields() as $value){
            $field = new Field($value);
            $type = $field->getType();
            $props = $field->getProperties();
            if($type =='DB_Enum' && $props['multiSelection']){
                $enum_ref = $this->enums->getEnum($props['_enum']);
                $multiTable = DB_Enum::getMultiTableName($this, $enum_ref);
                $data = RecordsManipulator::getMultiValueField($data,$field->getId(),$addedData,$this->getId(),$enum_ref->getId() );
                if(!$conn->insertData($multiTable,array($this->getRawTableName(),$enum_ref->getRawTableName()),$this->getDataSource()->getSchema(),$data)) {
                    throw new EnumException($conn->getLastError());
                }
            }
        }
        $actionsM->callPostAddActions($this,$addedData, $data);
        return $addedData;
    }
    public function modRecords($data){
        if(!$this->isData($data))
            return null;
        $actionsM = ActionManager::getInstance($this->enumInstance);
        $conn = $this->getConnection();
        $enumQ = $this->getEnumQuerier();
        $currentSchema = $this->getDataSource()->getSchema();

        $dbRecords = $enumQ->queryEnum(null,null,null,null,null,
            array(Revision::ID => Revision::ID),null,RecordsManipulator::getRecordsIds($data)
        );

        $details = RecordsManipulator::getRevisionDescription($data, $dbRecords);
        $data = $details['ok'];

        $originalData = $data;

        $this->modifyMultiEnumData($data,true,true);

//        foreach ($data as $record) {
//            foreach ($record as $fieldId => $value){
//                $noMultifield = $this->getField($fieldId);
//                $type = $noMultifield->getType();
//                $props = $noMultifield->getProperties();
//                if($type == 'DB_Enum' && $props['multiSelection']){
//                    $pId = $record[PrimaryKey::ID];
//                    $multiTable = DB_Enum::getMultiTableName($this, $this->enums->getEnum($props['_enum']));
//                    $conn->deleteData($multiTable, $this->getDataSource()->getSchema(), array(array(PrimaryKey::ID => $pId)),$this->getId(), PrimPrimaryKey::ID);
//                    $conn->insertData($multiTable, array($this->getId(), $this->enums->getEnum($props['_enum'])->getId()),
//                        $this->getDataSource()->getSchema(),RecordsManipulator::getMultiValueFieldFromMod($record[$fieldId], $pId));
//                }
//            }
//        }
        $data = $this->getValueArrayToDb($data);
        if (!$conn->updateData($this->getId(), $this->getDataSource()->getSchema(), $data)) {
            throw new EnumException($conn->getLastError());
        }
        $data = $conn->fetchData(false);
        $data = $enumQ->getValueArrayFromDb($data);

        $actionsM->callPostModActions($this,$data,$originalData);
        return array('underRevision'=> $details['underRevision'], 'modified'=>$data);
    }
    public function delRecords($data){
        if(!$this->isData($data))
            return null;
        $msg = $this->canDeleteData($data);
        if (!$msg) {
            $conn = $this->getConnection();
            $enumQ = $this->getEnumQuerier();
            $dbRecords = $enumQ->queryEnum(null,null,null,null,null,
                array(Revision::ID=>Revision::ID),null,RecordsManipulator::getRecordsIds($data)
            );
            $details = RecordsManipulator::getRevisionDescription($data, $dbRecords);
            $data = $details['ok'];
            $delData = $this->getValueArrayToDb($data);
            if (!$conn->deleteData($this->getId(), $this->getDataSource()->getSchema(), $delData)) {
                throw new EnumException($conn->getLastError());
            }
            $this->modifyMultiEnumData($data,true, false);
            return $details['underRevision'];
        }
        return $msg;
    }
    private function modifyMultiEnumData($data,$delete,$insert){
        $multiData = RecordsManipulator::groupRecordsByField($data,$this);
        $currentSchema = $this->getDataSource()->getSchema();
        $conn = $this->getConnection();

        foreach ($multiData as $fieldId => $fieldData){
            $field = $this->getField($fieldId);
            if(!isset($field)) continue;
            $refEnum = $field->getReferencedEnum($this->enumInstance);
            $multiTable = DB_Enum::getMultiTableName($this, $refEnum);

            if($delete)
              $conn->deleteData($multiTable,$currentSchema,$multiData[$fieldId],$this->getId(),null,true);
            if($insert)
              $conn->insertData($multiTable,array($this->getId(), $refEnum->getId()),$currentSchema,$multiData[$fieldId],false,true);
        }
    }
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

    private function canDeleteData($data)
    {

        $refs = Refs::getInstance($this->enumInstance);
        $references = $refs->getReferencesToEnum($this);
        $enums = Enums::getInstance($this->enumInstance);

        $ids = RecordsManipulator::getColumn($data, PrimaryKey::ID);
        $records_toDelete = RecordsManipulator::reIndexRecords($data);
        asort($ids);
        $ids_str = '(' . implode(',', $ids) . ')';
        $msg = "";
        foreach ($references as $values) {
            foreach ($values as $key => $value) {

                $field = Refs::getField($key);
                $enum = $enums->getEnum(Refs::getEnum($key));
                $field = $enum->getField($field);
                $prop = $field->getProperties();
                $fieldRef = $enums->getEnum($prop['_enum'])->getField($prop['field']);

                $conn = EnumsUtils::getDBConnection($enum);
                $conn->getFieldValuesArrayFilteredWithPrimaryKey($enum->getId(),
                    $enum->getDataSource()->getSchema(),
                    $field->getId(),
                    $ids_str);
                $arr = $conn->fetchData();
                $id = 0;
                $fieldProps = $field->getProperties();
                foreach ($arr as $record) {

                    $idd = $record[$field->getId()];
                    if ($idd > $id) {
                        $id = $idd;
                        $msg .= 'No se puede borrar porque el campo ' . $fieldRef->getHeader() . ' con el dato ';
                        $msg .= $records_toDelete[$idd][$fieldProps['field']] . ' esta referenciado por el campo ' . $field->getHeader() . '
                    del nomenclador ' . $enum->getName() . "\n";
                    }
                }
            }
        }
        return $msg;
    }
}