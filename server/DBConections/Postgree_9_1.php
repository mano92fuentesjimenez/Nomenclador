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
        $result = pg_query($this->dbHandler,$query);
        $this->lastResult = $result;
        if(!$result || pg_result_error($result))
            return false;
        return $result;
    }

    public function createTable($tableName, $schema, $fields)
    {
        $createStr = "CREATE TABLE \"$schema\".\"$tableName\"(";

        foreach ($fields as $value){
            if( $value['id'] == PrimaryKey::ID) {
                $createStr .="\"{$value['id']}\" {$value['type']} ,";
            }
            else {
                $haveDefault = isset($value['default']);
                $createStr .= "\"{$value['id']}\" {$value['type']}";
                if($haveDefault){
                    $createStr .= " DEFAULT {$value['default']}";
                }
                $createStr.=',';
            }
        }
        $createStr = substr($createStr,0,-1);
        $createStr.=");";

        $comment = "comment on column \"$schema\".\"$tableName\" ";

        foreach ($fields as $value){
            $createStr.= "$comment.\"{$value['id']}\" is '{$value['comm']}'; ";
        }
        return $this->query($createStr);

    }

    public function insertData($tableName, $fieldsOrder, $schema, $data, $returning, $isMultiEnum = false)
    {
        if(!is_array($data) || !count($data))
            return true;
        $f = '(';
        foreach ($fieldsOrder as $value) {
            $f.="\"$value\",";
        }
        $f = substr($f, 0, -1);
        $f.=')';

        $createStr = "INSERT INTO \"$schema\".\"$tableName\" $f VALUES";
        
        foreach ($data as $key => $values){

            if(!$isMultiEnum) {
                $createStr.="(";
                foreach ($fieldsOrder as $field) {
                    $createStr .= $values[$field] . ",";

                }
                $createStr = substr($createStr,0,-1);
                $createStr .="),";
            }
            else{
                foreach ($values as $v) {
                    $createStr.="(";
                    $createStr = "$createStr $key, $v";
                    $createStr .="),";
                }
            }


        }
        $createStr = substr($createStr,0,-1);
        if($returning) {
            $createStr = "$createStr returning * ";
        }
        $createStr .= ';';

        return $this->query($createStr);
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
        if(count($data)===0)
            return true;
        $query = "";

        foreach ($data as $record){
            $query.="UPDATE \"$schema\".\"$tableName\" SET ";
    
            $primaryKeyVal = null;
            $fields = array(PrimaryKey::ID);
            foreach ($record as $fieldName => $fieldValue){
                if ($fieldName == PrimaryKey::ID) {
                    $primaryKeyVal = $fieldValue;
                    continue;
                }
                $fields[] = $fieldName;
                $query.="\"$fieldName\"=$fieldValue,";
            }
            $query =substr($query,0,-1);
            $fields = implode(',',$fields);
            $query.="WHERE ".PrimaryKey::ID." = $primaryKeyVal returning $fields; ";
        }
        
        return $this->query($query);

    }

    public function deleteData($tableName, $schema, $data, $primaryField, $recordPK=null,$deleteFromKey=false)
    {
        if(count($data)===0)
            return true;
        if(is_null($primaryField))
            $primaryField = PrimaryKey::ID;
        if(is_null($recordPK))
            $recordPK = $primaryField;

        $query = "DELETE FROM \"$schema\".\"$tableName\" WHERE ";
        foreach ($data as $key => $record){
            $toDel = $deleteFromKey ? $key : $record[$recordPK];
            $query.="\"".$primaryField."\""."=".$toDel." or ";
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

    public function continueSelect($schema, $tableName, $field, $alias, $query, $baseName)
    {
        if(is_string($schema))
            return $query."\"$schema\".\"$tableName\".\"$field\" as \"$alias\", ";
        return "$query $baseName.\"$field\" as $alias,";
    }

    public function endSelect($query, $baseName)
    {
        $pk = PrimaryKey::ID;
        return  "$query $baseName.$pk";
    }

    public function startFrom($enumSchema, $tableName, $baseName)
    {
        return "FROM \"$enumSchema\".\"$tableName\" as $baseName ";
    }

    public function continueFrom($currentSchema, $currentTableName, $currentField, $query, $baseName)    {

        $r = "left JOIN \"$currentSchema\".\"$currentTableName\" on $baseName.\"$currentField\"";
        $r.= "=\"$currentSchema\".\"$currentTableName\".".PrimaryKey::ID." ";
        return $query.$r;

    }

    public function endFrom($query)
    {
        return $query;
    }

    public function getEnumData($schema, $baseName, $subQName, $selectSubq, $fromSub,$select,$from, $whereSubq, $offset=null, $limit=null, $idRow=null )
    {
        $search_path ="set search_path = $schema ";
        $query = "$selectSubq $fromSub";
        
        if($idRow){
            $query= "$query WHERE $baseName.".PrimaryKey::ID."='$idRow' ";
        }
        else if($whereSubq){
            $query= "$query $whereSubq ";
        }
        $query ="$query order by $baseName asc ";
        if($offset){
            $query="$query OFFSET $offset";
        }
        if($limit){
            $query="$query LIMIT $limit";
        }

        if(is_string($from)){
            $query = " $select from ($query) as $subQName $from";
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
        return " $where1 and $where2 ";
    }

    public function inWhere($field, $inData, $query, $baseName)
    {
        $q ='';
        foreach ($inData as $value) {
            if(is_array($value))
                $q .= "{$value[PrimaryKey::ID]},";
            else
                $q.="$value,";
        }
        $q = substr($q,0,-1);
        return "$query $baseName.$field in ( $q )";
    }

    public function endWhere($query)
    {
        $s = rtrim($query);
        $s = explode(' ',$s);
        $s_e = array_pop($s);
        $s = implode(' ',$s);

        //Removing trailing and
        if($s_e != 'and')
            $s = $s.$s_e;
        return $s;
    }

    public function continueFromMultiSelect( $enumSchema, $enumTableName,$currentTableName, $multiTableName, $query, $baseName)
    {
        $primaryKey = PrimaryKey::ID;
        $multiTable = "\"$enumSchema\".\"$multiTableName\"";
        $baseTable = "\"$enumSchema\".\"$enumTableName\" ";
        //El nombre de la tabla de un nomenclador es el identificador de un nomenclador.
        $query = "$query left join $multiTable on ($baseName.$primaryKey= $multiTable.\"$currentTableName\") ";
        $query = "$query left join $baseTable on ( $multiTable.\"$enumTableName\" = $baseTable.$primaryKey) ";
        return $query;
    }


}