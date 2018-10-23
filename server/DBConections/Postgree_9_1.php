<?php

/**
 * Created by PhpStorm.
 * User: mano
 * Date: 5/01/17
 * Time: 13:45
 */

class Postgree_9_1 extends DBConn
{
    private $dbHandler;
    private $lastResult;
    private $connData;
    
    public function __construct($data)
    {
        $this->connData = $data;

        $connStr = "host='{$data['host']}'";
        if(isset($data['port'])){
            $connStr.=' port=\''.$data['port'].'\' ';
        }
        if(isset($data['user'])){
            $connStr.=' user=\''.$data['user'].'\' ';
        }
        if(isset($data['password'])){
            $connStr.=' password=\''.$data['password'].'\' ';
        }
        if(isset($data['dbname'])){
            $fullConnStr = $connStr.' dbname=\''.$data['dbname'].'\' ';
        }
        $connStr .= " dbname='postgres'";

        if(isset($fullConnStr)) {
            $this->dbHandler = pg_connect($fullConnStr);
        }
        if(!$this->dbHandler) {
            $this->dbHandler = pg_connect($connStr);
            if (isset($data['dbname'])) {
                $this->createDB($data['dbname']);

                $this->dbHandler = pg_connect($fullConnStr);
            }
        }
        if($this->dbHandler ==false)
            throw new EnumDBNotExistException("No se pudo conectar a la fuente de datos:'{$data['name']}'.");
    }
    public function query($query)
    {
        $result = pg_query($query);
        $this->lastResult = $result;
        if(!$result || pg_result_error($result))
            return false;
        return $result;
    }

    public function createTable($tableName, $schema, $fields)
    {
        $createStr = "CREATE TABLE \"$schema\".\"$tableName\"(";

        $createStr.= '"'.$fields[0]['id'].'" '.$fields[0]['type']. (PrimaryKey::ID == $fields[0]['id']?'':( isset($fields[0]['default'])? ' DEFAULT \''.$fields[0]['default'].'\'' : ''));
        array_shift($fields);

        foreach ($fields as $value){
            if( $value['id'] == PrimaryKey::ID) {
                $createStr .= ',"' . $value['id'] . '"' . $value['type'] ;
            }
            else {
                $createStr .= ',"' . $value['id'] . '"' . $value['type'];
                if(isset($value['default'])){
                    $createStr .= ' DEFAULT \'' . $value['default'] . '\'';
                }
            }
        }
        $createStr.=");";

        $comment = "comment on column \"$schema\".\"$tableName\" ";

        foreach ($fields as $value){
            $createStr.= "$comment.\"{$value['id']}\" is \'{$value['comm']}\'; ";
        }
        return $this->query($createStr);

    }

    public function insertData($tableName, $fieldsOrder, $schema, $data, $returning)
    {
        $f = '(';
        foreach ($fieldsOrder as $value) {
            $f.="\"$value\",";
        }
        $f = substr($f, 0, -1);
        $f.=')';

        $createStr = "INSERT INTO \"$schema\".\"$tableName\" $f VALUES";
        
        foreach ($data as $values){
            
            $createStr.="(";
            foreach ($values as $value){                
                $createStr.=$value.",";
            }
            $createStr = substr($createStr,0,-1);
            $createStr .="),";
        }
        $createStr = substr($createStr,0,-1);
        if($returning) {
            $createStr = "$createStr returning * ";
        }
        $createStr .= ';';

        return $this->query($createStr);
    }

    public function getData($tableName, $schema, $start = null, $limit = null, $fieldFilter = null, 
                            $fieldValue = null, $fields = null,$select, $from, $idRow = null)
    {
        $query = $select.$from;
        if($fieldFilter){
            $query .= " WHERE \"$fieldFilter\" = '$fieldValue'";
        }
        $query .= ' order by '. PrimaryKey::ID;
        if($start) {
            $query .= " offset $start";
        }
        if($limit) {
            $query .= " limit $limit";
        }
        $query .= ';';

        return $this->query($query);
        
    }

    public function getFieldSingleValue($tableName, $schema, $fieldName, $rowIndex, $getAll = false, $fields = null)
    {
        $query = 'SELECT';
        if($getAll) {
            if(is_array($fields)){
                foreach ($fields as $value) {
                    $query .= " $value,";
                }
                $query .= ' "'.PrimaryKey::ID.'"';
            }
            else {
                $query .= " *";
            }
        }
        else{
            $query .= " \"$fieldName\"";
        }        
        $query .= " FROM \"$schema\".\"$tableName\" WHERE \"".PrimaryKey::ID."\" = ".$rowIndex.";";
        
        return  $this->query($query);
    }

   
    public function getDBNames()
    {
        $query = "SELECT datname as name FROM pg_catalog.pg_database WHERE not datistemplate;";
        return $this->query($query);
    }

    public function getLastError()
    {
        return pg_last_error($this->dbHandler);
    }

    public function fetchData($associative = false, $multi = null)
    {
        return pg_fetch_all($this->lastResult);       
    }

    public function updateData($tableName, $schema, $data)
    {
        $query = "";

        foreach ($data as $record){
            $query.="UPDATE \"$schema\".\"$tableName\" SET ";
    
            $primaryKeyVal = null;
            foreach ($record as $fieldName => $fieldValue){
                if ($fieldName == PrimaryKey::ID) {
                    $primaryKeyVal = $fieldValue;
                    continue;
                }                    
                $query.="\"$fieldName\"=$fieldValue,";
            }
            $query =substr($query,0,-1);
            $query.="WHERE ".PrimaryKey::ID." = $primaryKeyVal;\n ";
        }
        
        return $this->query($query);

    }

    public function deleteData($tableName, $schema, $data, $primaryField)
    {
        if(is_null($primaryField))
            $primaryField = PrimaryKey::ID;

        $query = "DELETE FROM \"$schema\".\"$tableName\" WHERE ";
        foreach ($data as $record){
            $query.="\"".$primaryField."\""."=".$record[$primaryField]." or ";
        }

        $query = substr($query,0,-3);
        $query.=";";
        return $this->query($query);
    }

    public function removeTable($tableName, $schema)
    {
        $query = "DROP TABLE \"$schema\".\"$tableName\" CASCADE ; ";
        return $this->query($query);
    }

    public function createDB($dbName)
    {
        $query = "CREATE DATABASE \"$dbName\";";
        return $this->query($query);

    }
    public function createIndex($schemaName,$tablename,$column){
        $query = "CREATE INDEX on \"$schemaName\".\"$tablename\" (\"$column\")";
        return $this->query($query);
    }

    public function getSchemas()
    {
        $query = 'select n.nspname as "schema"
                  from pg_catalog.pg_namespace n
                  where not( n.nspname like \'pg\_%\' or n.nspname like \'information_schema\')';
        return $this->query($query);
    }

    public function createSchema($schemaName)
    {
        $query = "CREATE SCHEMA \"$schemaName\";";
        return $this->query($query);
    }

    public function countRows($tableName, $schema, $where)
    {
        $query = "SELECT count(".PrimaryKey::ID.") from \"$schema\".\"$tableName\"";
        if(isset($where) && !is_null($where))
            $query .= " where $where";
        $query.=';';
        return $this->query($query);
    }

    public function addColumn($tableName, $schema, $fieldName, $columnType, $comm)
    {
        $query = "ALTER TABLE \"$schema\".\"$tableName\" ADD COLUMN \"$fieldName\" $columnType; Comment on column \"$schema\".\"$tableName\".\"$fieldName\" is '$comm'";

        return $this->query($query);
    }

    public function modColumn($tableName, $schema, $fieldName, $columnType, $comm)
    {
        return($this->delColumn($tableName, $schema,$fieldName) &&
        $this->addColumn($tableName, $schema, $fieldName, $columnType, $comm));

    }

    public function delColumn($tableName, $schema, $fieldName)
    {
        $query = "ALTER TABLE \"$schema\".\"$tableName\" DROP COLUMN IF EXISTS \"$fieldName\";";
        return $this->query($query);
    }

    public function setDefaultValueForColumn($tableName, $schema, $fieldName, $value)
    {
        $query = "ALTER TABLE \"$schema\".\"$tableName\" ALTER COLUMN \"$fieldName\" SET DEFAULT '$value';";
        $query .= "UPDATE \"$schema\".\"$tableName\" SET \"$fieldName\" = DEFAULT WHERE \"$fieldName\" IS NULL ";
        return $this->query($query);
    }

    public function getFieldValuesFilteredWithPrimaryKey($tableName, $schema, $fieldName, $fieldToFilter, $filterValue, $offset = null, $limit = null)
    {
        $query = "SELECT \"$fieldName\", \"".PrimaryKey::ID."\" FROM \"$schema\".\"$tableName\"
        where \"$fieldToFilter\"='$filterValue'";
        if($offset)
            $query.= " offset $offset";
        if($limit)
            $query .=" limit $limit";
        $query .= ';';
        return $this->query($query);
    }

    public function getFieldValuesArrayFilteredWithPrimaryKey($tableName, $schema, $fieldToFilter, $filterValues)
    {
        $query = "SELECT *, \"".PrimaryKey::ID."\" FROM \"$schema\".\"$tableName\"
                  where \"$fieldToFilter\"in $filterValues
                  order by $fieldToFilter;";
        return $this->query($query);
    }

    public function beginTransaction()
    {
        return $this->query('begin;');

    }

    public function commitTransaction()
    {
        return $this->query('commit;');
    }


    public function getRow($tablename, $schema, $row_number)
    {
        $query = "SELECT * FROM \"$schema\".\"$tablename\" WHERE \"".PrimaryKey::ID."\" = $row_number";
        return $this->query($query);
    }

    public function closeConnection()
    {
        pg_close($this->dbHandler);
    }

    public function tableExists($tablename,$schema)
    {
        $query = "select count(*) from pg_tables where schemaname='$schema' and tablename='$tablename' ";
        return $this->query($query);

    }

    public function startSelect()
    {
        return "SELECT ";
    }

    public function continueSelect($schema, $tableName, $field, $alias, $query, $foo = false)
    {
        if(!$foo)
          return $query."\"$schema\".\"$tableName\".\"$field\" as \"$alias\", ";
        return "$query foo.\"$field\" as \"$alias\", ";
    }

    public function endSelect($query, $schema, $tableName,$foo=false)
    {
        if(!$foo)
            return $query."\"$schema\".\"$tableName\".".PrimaryKey::ID;
        return "$query foo.".PrimaryKey::ID;
    }

    public function startFrom($enumSchema, $tableName, $start)
    {
        if(is_string($start))
            return "FROM ($start) as foo";

        return "FROM \"$enumSchema\".\"$tableName\" ";
    }

    public function continueFrom($enumSchema, $enumTableName,$currentSchema, $currentTableName, $currentField, $query)    {

        $r = "left JOIN \"$currentSchema\".\"$currentTableName\" on \"$enumSchema\".\"$enumTableName\".\"$currentField\"";
        $r.= "=\"$currentSchema\".\"$currentTableName\".".PrimaryKey::ID." ";
        return $query.$r;

    }

    public function endFrom($query)
    {
        return $query;
    }

    public function getEnumData($schema, $tableName, $select, $from, $where, $offset=null, $limit=null, $idRow=null, $selectsubq, $fromSubq)
    {
        $search_path ="set search_path = $schema ";
        $query = $selectsubq.' '.$fromSubq;
        
        if($idRow){
            $query.= " WHERE \"$schema\".\"$tableName\".\"".PrimaryKey::ID."\"='$idRow' ";
        }
        else if($where){
            $query.= " $where ";
        }
        if($offset){
            $query.=" OFFSET $offset";
        }
        if(!is_null($from)) {
            $f = $this->startFrom(null, null, $query);
            $f = " $f $from " ;
            $query = " $select $f";

        }
        if($limit){
            $query.=" LIMIT $limit";
        }

        $query = "$search_path ; $query ;";
        return $this->query($query);
    }

    public function startWhere($where = null)
    {
        if($where)
            return "WHERE $where and ";
        return 'WHERE ';
    }
    public function continueWhere($where1, $where2){
        if($where1 && $where2)
            return " $where1 and $where2 ";
    }

    public function inWhere($field, $inData, $query)
    {
        $q ='';
        foreach ($inData as $value) {
            if(is_array($value))
                $q .= "{$value[PrimaryKey::ID]},";
            else
                $q.="$value,";
        }
        $q = substr($q,0,-1);
        return "$query $field in ( $q )";
    }

    public function endWhere($query)
    {
        $s = rtrim($query);
        $s = explode(' ',$s);
        $s_e = array_pop($s);
        $s = implode(' ',$s);

        if($s_e != 'and')
            $s = $s.$s_e;
        return $s;
    }

    public function continueFromMultiSelect($enumSchema, $enumTableName, $currentSchema, $currentTableName, $multiTableName, $query)
    {
        $primaryKey = PrimaryKey::ID;
        //El nombre de la tabla de un nomenclador es el identificador de un nomenclador.
        $query = "$query inner join \"$enumSchema\".\"$multiTableName\" on (foo.$primaryKey=\"$enumTableName\") ";
        $query = "$query inner join \"$currentSchema\".\"$currentTableName\" on (\"$currentSchema\".\"$currentTableName\".$primaryKey = \"$currentTableName\") ";
        return $query;
    }


}