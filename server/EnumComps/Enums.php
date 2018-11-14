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
    private $enums;
    public $enumInstance;

    public function __construct($enumInstance, &$enum_tree, $enums)
    {
        $this->enumInstance = $enumInstance;
        $this->enum_tree = $enum_tree;
        $this->enums = isset($enums) ? $enums->enums : null;
        $this->actions = null;
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
                $type = $field->getType();
                $props = $field->getProperties();
                if (!$field || !$type::savedInBD() || ($type == 'DB_Enum' && $props['multiSelection'])){
                    continue;
                }
                $type = $field->getType();
                $record[$fieldId] = $type::getValueToDB($values, $value, $field, $connTypeStr);
            }
            $arr[] = $record;
        }
        return $arr;
    }
    public function getMultiValueField($data,$fieldId,$ids){
        $arr = array();
        $i = -1;
        foreach ($data as $d){
            $i++;
            foreach ($d as $key => $value) {
                if ($key == $fieldId) {
                    foreach ($value as $v) {
                        $r = array();
                        $r[] = $ids[$i][PrimaryKey::ID];
                        $r[] = $v[BaseType::VALUE_TYPE_VALUE_HEADER];
                        $arr[] = $r;
                    }
                }
            }
        }
        return $arr;
    }
    public function getMultiValueFieldFromMod($data, $id){
        $arr = array();
        foreach ($data as $d){
            $arr[]= array($id, $d['valueField']);
        }
        return $arr;
    }
    public function getIdsToRemoveMulti($data, $field){
        $arr = array();
        foreach ($data as $d){
            $arr[] = array($field=>$d[PrimaryKey::ID]);
        }
        return $arr;
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
    private function getRawTableName(){
        return $this->getId();
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

    public function getFieldsOrder($data)
    {
        $arr = array();
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

    public function hasData()
    {
        $conn = EnumsUtils::getDBConnection($this);
        $conn->countRows($this->getId(), $this->getDataSource()->getSchema());
        $v = reset($conn->fetchData());
        return $v['count'];
    }

    public function canBeDeleted()
    {
        $r = Refs::getInstance($this->enumInstance);
        $refs = $r->getReferencesToEnum($this);

        return $refs != true;
    }
    public function getCanBeDeletedMessage(){
        $r = Refs::getInstance($this->enumInstance);
        $refs = $r->getReferencesToEnum($this);
        if($refs) {
            $ret = 'El nomenclador ' . $this->getName() . ' no se puede eliminar, esta referenciado por:';
            foreach ($refs as $values) {
                foreach ($values as $from => $boolean) {
                    $splited = explode(':', $from);
                    $ret .= 'el campo:' . $this->enums[$splited[0]]['fields'][$splited[1]]['header'];
                    $ret .= ' del nomenclador:' . $this->enums[$splited[0]]['name'] . ', ';
                }
            }
            return substr($ret, 0, -2);
        }
        return null;
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
    public function addRecords($records){

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
        if(is_string($where)){
            $where = $this->processWhere($where,$baseName);
        }

        $ds = $this->getDataSource();
        $conn = EnumsUtils::getDBConnection($this);
        $select = $conn->startSelect();
        $from = $conn->startFrom($ds->getSchema(), $this->getRawTableName(), $baseName);

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

                        $from = $conn->continueFromMultiSelect($ds->getSchema(), $currentReferencedEnum->getRawTableName(),$this->getRawTableName(),$multiName,$from, $baseName);
                        //poner el valor verdadero del enum en $key (id del campo)
                        $select = $conn->continueSelect($ds->getSchema(),$multiName,$currentReferencedEnum->getRawTableName(),$key,$select,$baseName);
                        $select = $conn->continueSelect($ds2->getSchema(),$currentReferencedEnum->getRawTableName(),$rField->getId(),$key . BaseType::REF_TYPE_VALUE_HEADER,$select,$baseName);
                    }
                    else {

                        $from = $conn->continueFrom($ds2->getSchema(),$currentReferencedEnum->getRawTableName(), $key, $from, $baseName);
                        //poner el valor verdadero del enum en $key (id del campo)
                        $select = $conn->continueSelect(null,null, $key,$key, $select,$baseName);
                        $select = $conn->continueSelect($ds2->getSchema(),$currentReferencedEnum->getRawTableName(),$rField->getId(),
                            $key . BaseType::REF_TYPE_VALUE_HEADER, $select,$baseName);
                    }
                }
            }
            else {
                $select = $conn->continueSelect(null, null, $key,
                    $key, $select, $baseName);
            }
            unset($fields[$key]);
        }


        $select = $conn->endSelect($select,$baseName);

        $from = $conn->endFrom($from);

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

        if (!$conn->getEnumData($ds->getSchema(), $baseName, $select, $from, $whereSql,$offset, $limit,  $idRow)
        ) {
            throw new EnumException($conn->getLastError());
        }
        $data = $conn->fetchData(true, $multiField);

        if(is_array($inData)){
            if(is_array(reset($inData))){
                $this->mixDataFromAnyWhere($data,$inData);
            }
        }

        if (count($data) == 0) {
            return $data;
        }

        return $data;
    }
    private function processWhere($where,$baseName){
        $glue = '(?:(?i)or|and)';
        $operators = '((?i)like|=|>|<|>=|<=|<>)';
        $id = '[-_[:alnum:]]+?';
        $v = "'.*?'|\d+";
        $value = "$id|$v|\($v(?:,$v)*\)";
        $clause = "(?:(?<table>$id)\.)?(?<field>$id)\s*(?<operator>$operators)\s*(?<value>$value)\s*((?<glue>$glue)|$)";
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
    private function mixDataFromAnyWhere(&$data, &$anyWhereData){

        foreach ($data as &$record){
            $id = $record[PrimaryKey::ID];
            $r = $this->getRecordWithId($anyWhereData,$id);

            foreach ($r as $key => $value ){
                $record[$key] = $value;
            }
        }
    }
    private function getRecordWithId(&$anyWhereData, $id){
        foreach ($anyWhereData as &$record){
            if($record[PrimaryKey::ID] == $id)
                return $record;
        }
        throw new Exception('Este error nunca debe pasar');
    }

    private function getInData(&$data, $refField)
    {
        $refId = $refField->getId();
        $d = array();
        foreach ($data as &$record) {
            $d[] = $record[$refId];
        }
        return $d;
    }

    private function mixData(&$data, $dataToMix, $field, $enumField)
    {
        if (count($data) == 0) {
            return array();
        }
        $id = $field->getId();
        foreach ($data as &$record) {
            //arreglar esto
            $record[ $id. BaseType::REF_TYPE_VALUE_HEADER] = $dataToMix[$record[$field->getId()]][$enumField->getId()];
        }
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
    public function canDeleteData($data)
    {

        $refs = Refs::getInstance($this->enumInstance);
        $references = $refs->getReferencesToEnum($this);
        $enums = Enums::getInstance($this->enumInstance);

        $ids = $this->getColumn($data, PrimaryKey::ID);
        $records_toDelete = $this->reIndexRecords($data);
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

    private function getColumn($data, $field)
    {
        $arr = array();
        foreach ($data as $record) {
            $arr[] = $record[$field];
        }
        return $arr;
    }

    private function reIndexRecords($data)
    {
        $arr = array();
        foreach ($data as $key => $value) {
            $arr[$value[PrimaryKey::ID]] = $value;
        }
        return $arr;
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
            $enum = $enums->getEnum($value);
            $enum->remove();
        }
        EnumsUtils::saveHeaders($enumInstance);
    }

}