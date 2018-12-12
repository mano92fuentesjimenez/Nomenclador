<?php
/**
 * Created by PhpStorm.
 * User: mano
 * Date: 11/25/18
 * Time: 8:19 PM
 */
require_once 'EnumComps/Enum.php';
class EnumQuerier extends Enum
{
    private $where;
    /**
     * Dice cuantos records tiene este nomenclador
     * @param $where {string}   Es la cadena representando al where en la consulta.
     * @return mixed
     */
    public function getTotalRecords($where){
        $actionM = ActionManager::getInstance($this->enumInstance);
        $c = $actionM->callCountActions($this, $where);
        if(is_numeric($c)){
            return $c;
        }

        $conn = EnumsUtils::getDBConnection($this);
        $e = $conn->countRows($this->getId(), $this->getDataSource()->getSchema(), $where);
        $res = $conn->fetchData();
        $res = reset($res);
        return $res['count'];
    }


    /**
     * Convierte los valores de data, provenientes de la fuente de datos al tipo que se usa en la parte del cliente.
     * @param $data {array}
     * @param $loadAllData {bool}
     * @throws  Exception
     * @return array
     */
    public function getValueArrayFromDb($data, $loadAllData = false)
    {
        $connTypeStr = $this->getDataSource()->getDataSourceType();
        $fields = &$this->enum_tree['fields'];
        $enums = Enums::getInstance($this->enumInstance);

        $arr = array();
        foreach ($data as $key => $values) {
            $record = array();
            foreach ($values as $fieldId => $value) {

                $field = $this->getField($fieldId);
                if (is_null($field)) {
                    $record[$fieldId] = $value;
                    continue;
                }
                $type = $field->getType();
                if ($type == 'DB_Enum' && $loadAllData) {
                    $prop = $field->getProperties();

                    $enum = $enums->getEnum($prop['_enum']);
                    $record[$fieldId] = reset($enum->getEnumData(null, 1, true, $value));
                } else {
                    if ($loadAllData && !$type::showInReport()) {
                        continue;
                    }
                    if ($type::dependsOnOtherFields($this, $field)) {
                        if ($type::lazyInit($this, $field)) {
                            $value = $values[PrimaryKey::ID];
                        }
                    }
                    $record[$fieldId] = $type::getValueFromDB($this->enumInstance,$values, $value, $field, $connTypeStr);
                }
            }
            $arr[$key] = $record;
        }
        return $arr;
    }

    public function setWhere($where){
        $this->where = $where;
    }

    /**
     * Funcion para recuperar los datos de un enum
     *
     * @param $offset {number}          Especifica desde que fila se van a leer los datos
     * @param $limit {number}           Especifica cuantas filas se van a leer
     * @param bool $loadAllData {bool}  Especifica si los tipos nomencladores deben leer todos los datos de la
     *                                 fila a la que apuntan
     * @param number $idRow             Especifica si se debe leer una fila en especifico
     * @param string $fieldLazyToEval   Los tipos que se evaluan bajo demando (son lazy), no se evaluan a menos que
     *                                 se le pida. $fieldLazyToEval es el identificador de un campo con tipo lazy que
     *                                 requiere ser evaluado.
     * @param array(string) $fields     Si tiene valor, es el conjunto de campos que se deben leer de base de datos.
     *                                 Y que se devuelven.
     * @param string where
     * @param array $inData             Especifica los id de los datos que se deben cargar
     * @return array {records}          Devuelve los datos en forma de records [{...},{...},{...}].
     * @throws Exception
     */
    public function queryEnum($offset = null, $limit = null, $loadAllData = false, $idRow = null,
                              $fieldLazyToEval = null, $fields = null, $where=null, $inData = null)
    {
        $result = $this->getEnumData($offset, $limit, $loadAllData, $idRow, $fieldLazyToEval, $fields,$where, $inData);
        $result = array_values($result);
        return $result;
    }

    /**
     * Funcion para recuperar los datos de un enum
     * @param $offset {number}          Especifica desde que fila se van a leer los datos
     * @param $limit {number}           Especifica cuantas filas se van a leer
     * @param bool $loadAllData {bool}  Especifica si los tipos nomencladores deben leer todos los datos de la
     *                                 fila a la que apuntan
     * @param number $idRow             Especifica si se debe leer una fila en especifico
     * @param string $fieldLazyToEval   Los tipos que se evaluan bajo demando (son lazy), no se evaluan a menos que
     *                                 se le pida. $fieldLazyToEval es el identificador de un campo con tipo lazy que
     *                                 requiere ser evaluado.
     * @param array(string) $fields     Si tiene valor, es el conjunto de campos que se deben leer de base de datos.
     *                                 Y que se devuelven.
     * @param string where
     * @param array $inData             Especifica los id de los datos que se deben cargar
     * @return array {records}          Devuelve los datos en forma de records [{...},{...},{...}].
     * @throws Exception
     */
    private function getEnumData($offset = null, $limit = null, $loadAllData = false, $idRow = null,
                                 $fieldLazyToEval = null, $fields = null,$where=null, $inData = null)
    {
        $actionM = ActionManager::getInstance($this->enumInstance);

        //cojo los campos a evaluar.
        $fieldsWithDep = $this->getFieldsForGettingData($fields);
        //filtrar los fields a coger de base de datos quitando los que no se guardan en bd
        $fieldsToGet = $this->getFieldsSavedInBD($fieldsWithDep);

        if($actionM->callPreLoadActionsForEnum($this,$offset, $limit, $idRow, $fieldsToGet, $inData, $loadAllData, $where) == ActionManager::STOP){
            return array();
        }

        $data = $this->getData($offset, $limit, $idRow, $fieldsToGet, $inData, $loadAllData, $where);

        //se procesa el valor guardado en bd obteniendo el valor real a usar
        $data = $this->getValueArrayFromDb($data, $loadAllData);

        //se le da valor a los campos que no se guardan en bd pero dependen de los que si se guardan en bd.
        $data = $this->addValuesNotInDB($data, $fieldLazyToEval, $fieldsWithDep);
        //se filtra los campos por lo que se pidió.
        if (!is_null($fields)) {
            $data = $this->filterData($data, $fields);
        }
        $actionM->callPostLoadActionsForEnum($this,$data);

        return $data;
    }

    private function getAllFieldsKeys()
    {
        $keys = array();
        foreach ($this->enum_tree['fields'] as $key => $value) {
            if($key == PrimaryKey::ID){
                continue;
            }
            $keys[$key] = $key;
        }
        return $keys;
    }

    private function getData($offset = null, $limit = null, $idRow = null,$fieldsToGet = null, $inData = null, $loadAllData, $where)
    {
        $fields = $fieldsToGet;
        $baseName = 'base';
        $subQeryName ='subq';

        $where = $this->processWhere($where,$baseName);


        $ds = $this->getDataSource();
        $conn = EnumsUtils::getDBConnection($this);
        $select = $conn->startSelect();
        $selectSubq = $conn->startSelect();
        $fromSubq = $conn->startFrom($ds->getSchema(), $this->getRawTableName(), $baseName);
        $from = null;

        $multiField = null;
        unset($fields[Primarykey::ID]);

        //recorro todos los campos
        $fieldsWalking = $fields;

        foreach ($fieldsWalking as $key => $value) {

            $field = $this->getField($key);

            $prop =$field->getProperties();
            $currentReferencedEnum =null;
            $isMulti = $field->isMulti();

            if ($field->isEnum()){
                $currentReferencedEnum = $field->getReferencedEnum($this->enumInstance);
                $rField = $field->getReferencedField($this->enumInstance);
                $ds2 = $currentReferencedEnum->getDataSource();

                if ($ds2->distinctDs($ds)) {
                    throw new EnumException('2 nomencladores no pueden ser referenciados desde datasources distintos');
                    //continue;
                }
                else {
                    if($isMulti){

                        $multiField = $field;
                        $multiName = DB_Enum::getMultiTableName($this, $currentReferencedEnum);

                        $from = $conn->continueFromMultiSelect($ds->getSchema(), $currentReferencedEnum->getRawTableName(),$this->getRawTableName(),$multiName,'', $subQeryName);
                        //poner el valor verdadero del enum en $key (id del campo)
                        $select = $conn->continueSelect($ds->getSchema(),$multiName,$currentReferencedEnum->getRawTableName(),$key,$select,$subQeryName);
                        $select = $conn->continueSelect($ds2->getSchema(),$currentReferencedEnum->getRawTableName(),$rField->getId(),$key . BaseType::REF_TYPE_VALUE_HEADER,$select,$subQeryName);
                    }
                    else {

                        $fromSubq = $conn->continueFrom($ds2->getSchema(),$currentReferencedEnum->getRawTableName(), $key, $fromSubq, $baseName);
                        //poner el valor verdadero del enum en $key (id del campo)
                        $selectSubq = $conn->continueSelect(null,null, $key,$key, $selectSubq,$baseName);
                        $selectSubq = $conn->continueSelect($ds2->getSchema(),$currentReferencedEnum->getRawTableName(),$rField->getId(),
                            $key . BaseType::REF_TYPE_VALUE_HEADER, $selectSubq,$baseName);

                        $select = $conn->continueSelect(null,null, $key,$key, $select,$subQeryName);
                        $select = $conn->continueSelect(null,null,$key . BaseType::REF_TYPE_VALUE_HEADER,
                            $key . BaseType::REF_TYPE_VALUE_HEADER, $select,$subQeryName);
                    }
                }
            }
            else {
                $selectSubq = $conn->continueSelect(null, null, $key,
                    $key, $selectSubq, $baseName);
                $select = $conn->continueSelect(null, null, $key,
                    $key, $select, $subQeryName);
            }
            unset($fields[$key]);
        }


        $select = $conn->endSelect($select,$subQeryName);
        $selectSubq = $conn->endSelect($selectSubq,$baseName);

        $fromSubq = $conn->endFrom($fromSubq);

        if (is_array($inData)) {
            $whereSql = $conn->startWhere($where);
            $whereSql= $conn->inWhere(PrimaryKey::ID, $inData, $whereSql, $baseName);
            $whereSql = $conn->endWhere($whereSql);
        }
        if($where && $whereSql) {
            $whereSql = $conn->continueWhere($whereSql, $where);
            $whereSql = $conn->endWhere($whereSql);
        }
        else if($where){
            $whereSql = $conn->startWhere($where);
            $whereSql = $conn->endWhere($whereSql);
        }

        if (!$conn->getEnumData($ds->getSchema(), $baseName, $subQeryName, $selectSubq, $fromSubq,$select,$from, $whereSql,$offset, $limit,  $idRow)
        ) {
            throw new EnumException($conn->getLastError());
        }
        $data = $conn->fetchData(true, $multiField);

        if(is_array($inData)){
            if(is_array(reset($inData))){
                RecordsManipulator::mixDataFromAnyWhere($data,$inData);
            }
        }
        if(is_string($where) && count($data) ===0 )
            throw new DataNotExists('El filtro no contiene a ningun dato');
        else if(!is_null($inData) && count($data) === 0)
            throw new DataNotExists('No existe ningun dato con un identificador contenido en el arreglo de identificadores');
        else if (!is_null($idRow) && count($data) === 0)
            throw new DataNotExists("No existe un record con identificador: '$idRow''");
        return $data;
    }
    private function processWhere($where,$baseName){
        $ret = null;
        if(is_string($where)) {
            $ret = $this->parseWhere($where, $baseName);
        }
        if(is_string($this->where) ){
            $r = $this->parseWhere($this->where,$baseName);
            if(is_null($ret))
                $ret = $r;
            else
                $ret = "($ret) and ($r)";
        }
        return $ret;
    }
    private function parseWhere($where, $baseName){
        $glue = '(?:(?i)or|and)';
        $operators = '(?:not )?((?i)like|=|>|<|>=|<=|<>|in)';
        $id = '[-_[:alnum:]]+?';
        $v = "('.*?'|\d+)";
        $value = "($id)|($v)|(\($v(?:,$v)*\))";
        $clause = "^\s*(?:(?<table>$id)\.)?(?<field>$id)\s*(?<operator>$operators)\s*(?<value>$value)\s*((?<glue>$glue)|$)";
        $regEx = "~$clause~";

        preg_match_all($regEx,$where,$matches,PREG_SET_ORDER);

        $ret = '';
        foreach ($matches as $match){
            $table = $match['table'];
            if($match['table'] ==='' || $match['table'] === $this->getRawTableName())
                $table = $baseName;
            $field = $match['field'];
            $op = $match['operator'];
            $value = $match['value'];
            $glue = $match['glue'];
            $ret = "$ret \"$table\".\"$field\" $op $value $glue";
        }
        return $ret;
    }
    /**
     * @param array $fields
     * @param string $fieldId Id del campo que se quiere leer.
     * @return array            Especifica que campos se van a leer
     */
    private function getFieldsForGettingData($fields = null)
    {
        if ($fields == null) {
            $fields = $this->getAllFieldsKeys();
            return $fields;
        }
        //anhadir las dependencias de estos campos si son de tipo formula.
        $changes = true;
        while ($changes) {
            $changes = false;
            //clono los campos.
            $fieldsAux = $fields;
            foreach ($fieldsAux as $value) {
                $field = $this->getField($value);
                $type = $field->getType();
                //si este campo depende de otros campos
                if ($type::dependsOnOtherFields($this, $field)) {
                    //cojo los campos de los cuales depende.
                    $dependencies = $type::getDependencies($this, $field);

                    //solo anhado aquellos que no estan anhadidos ya.
                    foreach ($dependencies as $key => $value) {
                        //lo cual logro ya que fields es un arreglo asociativo, no se repite nunca la misma llave.
                        $fields[$key] = $key;
                    }

                }
            }
        }
        return $fields;
    }

    private function getFieldsSavedInBD($fields)
    {
        $r = array();
        foreach ($fields as $key => $value) {
            $field = new Field($this->enum_tree['fields'][$key]);
            $type = $field->getType();
            if ($type::savedInBD()) {
                $r[$key] = $key;
            }
        }
        return $r;
    }

    /**
     * @param $data {Array}
     * @param $fields
     * @return array
     */
    private function filterData($data, $fields)
    {
        $r = array();
        foreach ($data as $primarykey => $values) {
            $record = array();
            foreach ($values as $key => $value) {
                if ( (isset($fields[$key]) || $key == PrimaryKey::ID) || is_null($this->getField($key))) {
                    $record[$key] = $value;
                }
            }
            $r[$primarykey] = $record;
        }
        return $r;
    }

    private function addValuesNotInDB($data, $fieldToEval, $fieldsToLook)
    {

        $connTypeStr = $this->getDataSource()->getDataSourceType();
        $fields = $this->getFieldsInOrderOfDependency($fieldToEval);
        $enums = Enums::getInstance($this->enumInstance);

        $auxFields = $fields;
        //fieldsToLook ya posee todos los campos requeridos. Si se requiere solo uno y tiene varias dependencias, estas
        //van a estar en este campo.
        foreach ($auxFields as $key => $value) {
            if (!isset($fieldsToLook[$value['id']])) {
                unset($fields[$key]);
            }
        }

        /*
         * $fields aqui es un arreglo de los campos que dependen de otros campos para poder obtener su valor,
         * por ejemplo: formula.
         * Este arreglo se ordeno por orden de necesidad, los de mas abajo son los que pudieran depender de los campo
         * que se encuentran mas arriba en el arreglo.
         */
        foreach ($data as &$values) {
            foreach ($fields as $value) {
                $field = new Field($value);
                $type = $field->getType();

                // en este paso el campo DB_Enum siempre va a tener el valor que necita para ser calculado a menos que
                // apunte a un campo de tipo lazy en cuyo caso debe mandar a calcularlo
                if ($type == 'DB_Enum') {
                    $prop = $field->getProperties();
                    $enum = $enums->getEnum($prop['_enum']);
                    $refField = $enum->getField($prop['field']);
                    $refType = $refField->getType();
                    if($refType::dependsOnOtherFields() && $refType::lazyInit() && $field->field_tree['needToEval']){
                        $values[$field->getId()] = DB_Enum::evalFormula($this->enumInstance, $this,$field, $values, null, $connTypeStr);
                    }
                    continue;
                }
                else if($type::lazyInit($this,$field) && !$field->field_tree['needToEval']){
                    $values[$field->getId()] = $type::getValueFromDB($this->enumInstance, $values, null, $field, $connTypeStr);
                    continue;
                }
                else{
                    $values[$field->getId()] = $type::evalFormula($this->enumInstance,$this,$field, $values, null, $connTypeStr);
                }

            }
        }
        return $data;
    }

    private function getFieldsInOrderOfDependency($fieldToEval)
    {

        $fields = $this->getFieldsThatDependsOnOtherFields();
        $fields = self::buildDependencyGraph($fields, $fieldToEval);

        usort($fields, 'self::sortfieldsByDepthInGraph');
        return $fields;

    }

    private function getFieldsThatDependsOnOtherFields()
    {
        $fields = $this->getFields();
        $enums = Enums::getInstance($this->enumInstance);
        $r = array();
        foreach ($fields as $key => $value) {
            $_field = new Field($value);
            $_type = $_field->getType();
            $properties = $_field->getProperties();
            if ($_type == 'DB_Enum') {
                /*
                 * Si el tipo del campo al que apunto enum depende de otros tipos, pero no es lazy, este se calcula en
                 * cuanto se le hace getValueFromDB.
                 * Pero si el tipo al que apunta, se calcula lazy entonces el aun no tiene el valor, e incluso puede que
                 * nunca lo tenga, esto depende de si se lo mandan a calcular o algun campo que depende de este se lo
                 * mandaron a calcular.
                 * Es por esto que se debe anhadir al listado de fields que dependen de otros fields.
                 */
                $enum = $enums->getEnum($properties['_enum']);
                $field = $enum->getField($properties['field']);
                $type = $field->getType();
                if ($type::dependsOnOtherFields($enum, $field)) {
                    if ($type::lazyInit($enum, $field)) {
                        $r[$key] = $value;
                    }
                }
                continue;
            }
            if ($_type::dependsOnOtherFields($this, $_field)) {
                $r[$key] = $value;
            }
        }
        return $r;
    }

    private static function sortfieldsByDepthInGraph($a, $b)
    {
        if ($a['maxD'] == $b['maxD']) {
            return 0;
        }
        return $a['maxD'] < $b['maxD'] ? -1 : 1;
    }

    private static function buildDependencyGraph($fields, $fieldToEval)
    {

        try {
            foreach ($fields as $key => &$value) {
                if (!isset($value['visited'])) {
                    self::dfs($fields, $value, 0, $fieldToEval);
                }
            }
        } catch (DFSCycle $e) {
            return $e->toString();
        }
        return $fields;
    }

    private static function dfs(&$fields, &$field, $depth, $fieldToEval)
    {
        $dep = $field['properties']['dependencies'];
        $field['visited'] = true;
        $field['visiting'] = true;

        $needToEvalLazy = ($fieldToEval == $field['id'] || $field['needToEval']);
        $field['needToEval'] = $needToEvalLazy;
        $maxD = 0;
        foreach ($dep as $key => $value) {
            //Puede depender de campos que no son de tipo formula
            if (!isset($fields[$key])) {
                continue;
            }
            $fields[$key]['needToEval'] = $needToEvalLazy || $fields[$key]['needToEval'];
            if (isset($fields[$key]['visited'])) {
                if (!$fields[$key]['visiting']) {
                    $maxD = max($maxD, $fields[$key]['maxD']) + 1;
                } else {
                    throw new DFSCycle("Hay un ciclo.");
                }
            } else {

                $maxD = max($maxD, self::dfs($fields, $fields[$key], $depth + 1, $fieldToEval)) + 1;
            }
        }
        $field['visiting'] = false;
        $field['maxD'] = $maxD;
        return $maxD;
    }

}