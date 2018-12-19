<?php

/**
 * Created by PhpStorm.
 * User: mano
 * Date: 5/01/17
 * Time: 13:40
 */



class DBConnectionTypes
{
    const POSTGREE_9_1 = "Postgree_9_1";
}
abstract class DBConn{

    /**Ejecuta la query en la base de datos.
     * @param $query        {string}    Query a ejecutar.
     * @return resource
     */
    public abstract function query($query);

    /**
     * @param $tableName
     * @param $schema nombre del schema
     * @param $fields  Array de (fieldName, type)
     */
    public abstract function createTable($tableName, $schema, $fields);
    public abstract function createSchema($schemaName);
    public abstract function createDB($dbName);
    public abstract function createIndex($tablename,$column,$column);

    /**Inserta los datos en la tabla especificada
     * @param $tableName {string}   Nombre de la tabla donde se van a insertar los datos.
     * @param $fieldsOrder {[]}     Orden de los campos en la tabla.
     * @param $schema
     * @param $data {[]}     Arreglo de arreglo
     * @return bool Retorna true si se pudo insertar, false en caso contrario.
     */
    public abstract function insertData($tableName, $fieldsOrder, $schema, $data, $returning, $isMultiEnum);
    public abstract function updateData($tableName, $schema, $data);
    public abstract function deleteData($tableName, $schema, $data, $primaryField, $recordPK, $fromKey);

    public abstract function removeTable($tableName, $schema);

    public abstract function beginTransaction();
    public abstract function commitTransaction();
    
    public abstract function getEnumData($schema, $baseName, $subQName, $selectSubq, $fromSub,$select,$from, $whereSubq, $offset, $limit, $idRow );

    public abstract function countRows($tableName, $schema, $where);
    public abstract function getFieldSingleValue($tableName, $schema, $fieldName, $rowIndex, $getAll = false, $fields = null);
    public abstract function getFieldValuesFilteredWithPrimaryKey($tableName, $schema, $fieldName, $fieldToFilter, $filterValue, $offset = null, $limit = null);
    public abstract function getFieldValuesArrayFilteredWithPrimaryKey($tableName, $schema, $fieldToFilter, $filterValues);
    public abstract function getDBNames();
    public abstract function getLastError();
    public abstract function getSchemas();
    public abstract function getRow($tablename, $schema, $row_number);
    public abstract function fetchData($associative, $multiEnumFields);

    public abstract function addColumn($tableName, $schema, $fieldName, $columnType, $comm);
    public abstract function modColumn($tableName, $schema, $fieldName, $columnType, $comm);
    public abstract function delColumn($tableName, $schema, $fieldName);
    public abstract function setDefaultValueForColumn($tableName, $schema, $fieldName,$value);
    public abstract function closeConnection();
    public abstract function tableExists($tablename, $schema);
    
    public abstract function startSelect();
    public abstract function continueSelect($schema, $tableName, $field, $alias, $query, $baseName);
    public abstract function endSelect($query, $baseName);
    
    public abstract function startFrom($enumScheman,$tableName,$baseName);
    public abstract function continueFrom($enumSchema,$enumTableName,$currentField, $query, $baseName);
    public abstract function continueFromMultiSelect($enumSchema,$enumTableName, $currentTableName, $multiTableName,$query, $baseName);
    public abstract function endFrom($query);

    public abstract function startWhere($where);
    public abstract function continueWhere($where1, $where2);
    public abstract function inWhere($field, $inData, $query, $baseName);
    public abstract function endWhere($query);

}

class DBConnProxy extends  DBConn
{

    private $dbConnType;
    private $dbConn;
    private $key;
    private static $connections;

    /**Construye una conneccion a una fuente de datos de las especificadas en DBConnectionTypes
     * DBConnProxy constructor.
     * @param $dataSource {DataSource} 
     */
    public function __construct($dataSource)
    {
        if (DBConnProxy::$connections == null) {
            DBConnProxy::$connections = array();
        }
        $key = $dataSource->getKey();
        $this->key = $key;
        if (key_exists($key, DBConnProxy::$connections)) {
            $val = &DBConnProxy::$connections[$key];
            $this->dbConnType = $val[0];
            $this->dbConn = $val[1];
            return;
        }
        switch ($dataSource->getType()) {
            case DBConnectionTypes::POSTGREE_9_1: {
                $this->dbConnType = DBConnectionTypes::POSTGREE_9_1;
                require_once DBConnectionTypes::POSTGREE_9_1 . ".php";
                $this->dbConn = new Postgree_9_1($dataSource->getConnData(), $dataSource->getType());

                DBConnProxy::$connections[$key] = array($this->dbConnType, $this->dbConn);
            }
            break;
            default:
                {
                    throw new EnumException('El tipo de fuente de datos no existe');
                }
        }
    }

    public function query($query)
    {
        return $this->dbConn->query($query);
    }


    public function createTable($tableName, $schema, $fields)
    {
        return $this->dbConn->createTable($tableName, $schema, $fields);
    }

    public function insertData($tableName, $fieldsOrder, $schema, $data, $returning = false, $isMultiEnum = false)
    {
        return $this->dbConn->insertData($tableName, $fieldsOrder, $schema, $data, $returning, $isMultiEnum);
    }


    public function getFieldSingleValue($tableName, $schema, $fieldName, $rowIndex, $getAll = false, $fields = null)
    {
        return $this->dbConn->getFieldSingleValue($tableName, $schema, $fieldName, $rowIndex, $getAll, $fields);
    }


    public function getDBNames()
    {
        return $this->dbConn->getDBNames();
    }

    public function getLastError()
    {
        return $this->dbConn->getLastError();
    }

    public function fetchData($associative = false,$multiEnumField = null)
    {        
        $arr = $this->dbConn->fetchData();
        if (!$associative) {
            return $arr;
        }
        $ret = array();
        $id = null;
        if(!is_null($multiEnumField))
            $id = $multiEnumField->getId();

        if(is_array($arr)) {
            foreach ($arr as $record) {
                $key = $record[PrimaryKey::ID];

                if(!isset($ret[$key]))
                    $ret[$key] = $record;

               if($multiEnumField && !is_null($record[$id])) {
                   if (!is_array($ret[$key][$id])) {
                       $ret[$key][$id] = array();
                       //el caso en que el campo al que apunta sea uno virtual.
                       if (isset($record[$id . BaseType::REF_TYPE_VALUE_HEADER]) && !is_null($record[$id . BaseType::REF_TYPE_VALUE_HEADER]))
                           $ret[$key][$id . BaseType::REF_TYPE_VALUE_HEADER] = array();
                   }
                   $ret[$key][$id][] = $record[$id];
                   if (isset($record[$id . BaseType::REF_TYPE_VALUE_HEADER]) && !is_null($record[$id . BaseType::REF_TYPE_VALUE_HEADER]))
                       $ret[$key][$id . BaseType::REF_TYPE_VALUE_HEADER][] = $record[$id . BaseType::REF_TYPE_VALUE_HEADER];
               }
            }
        }
        return $ret;
    }

    public function updateData($tableName, $schema, $data)
    {
        return $this->dbConn->updateData($tableName, $schema, $data);
    }

    public function deleteData($tableName, $schema, $data, $primaryField = null, $recordPK=null, $fromKey=false)
    {
        return $this->dbConn->deleteData($tableName, $schema, $data, $primaryField, $recordPK, $fromKey);
    }

    public function removeTable($tableName, $schema)
    {
        $this->dbConn->removeTable($tableName, $schema);

    }

    public function createDB($dbName)
    {
        $this->dbConn->createDB($dbName);
    }

    public function getSchemas()
    {
        return $this->dbConn->getSchemas();
    }

    public function createSchema($schemaName)
    {
        return $this->dbConn->createSchema($schemaName);
    }

    public function countRows($tableName, $schema, $where)
    {
        return $this->dbConn->countRows($tableName, $schema, $where);
    }

    public function addColumn($tableName, $schema, $fieldName, $columnType, $comm)
    {
        return $this->dbConn->addColumn($tableName, $schema, $fieldName, $columnType, $comm);
    }

    public function modColumn($tableName, $schema, $fieldName, $columnType, $comm)
    {
        return $this->dbConn->modColumn($tableName, $schema, $fieldName, $columnType, $comm);
    }

    public function delColumn($tableName, $schema, $fieldName)
    {
        return $this->dbConn->delColumn($tableName, $schema, $fieldName);
    }

    public function setDefaultValueForColumn($tableName, $schema, $fieldName, $value)
    {
        if(!is_null($value))
            return $this->dbConn->setDefaultValueForColumn($tableName, $schema, $fieldName, $value);
        return true;
    }

    public function getFieldValuesFilteredWithPrimaryKey($tableName, $schema, $fieldName, $fieldToFilter, $filterValue, $offset = null, $limit = null)
    {
        return $this->dbConn->getFieldValuesFilteredWithPrimaryKey($tableName, $schema, $fieldName, $fieldToFilter, $filterValue, $offset, $limit);
    }

    public function getFieldValuesArrayFilteredWithPrimaryKey($tableName, $schema, $fieldToFilter, $filterValues)
    {
        return $this->dbConn->getFieldValuesArrayFilteredWithPrimaryKey($tableName, $schema, $fieldToFilter, $filterValues);
    }

    public function beginTransaction()
    {
        return $this->dbConn->beginTransaction();
    }

    public function commitTransaction()
    {
        return $this->dbConn->commitTransaction();
    }


    public function getRow($tablename, $schema, $row_number)
    {
       return $this->dbConn->getRow($tablename, $schema, $row_number);
    }

    public function closeConnection()
    {
        unset(DBConnProxy::$connections[$this->key]);
        return $this->dbConn->closeConnection();
    }

    public function tableExists($tablename, $schema)
    {
        return $this->dbConn->tableExists($tablename, $schema);
    }

    public function startSelect()
    {
        return $this->dbConn->startSelect();
    }

    public function continueSelect($schema, $tableName, $field, $alias, $query, $baseName)
    {
        return $this->dbConn->continueSelect($schema, $tableName, $field, $alias,$query, $baseName);
            
    }

    public function endSelect($query, $baseName)
    {
        return $this->dbConn->endSelect($query, $baseName);
    }

    public function startFrom($enumSchema, $tableName, $baseName)
    {
        return $this->dbConn->startFrom($enumSchema, $tableName, $baseName);
            
    }

    public function continueFrom($enumSchema, $enumTableName,  $currentField, $query,$baseName)
    {
        return $this->dbConn->continueFrom($enumSchema, $enumTableName, $currentField, $query, $baseName);
    }

    public function endFrom($query)
    {
        return $this->dbConn->endFrom($query);
    }

    public function getEnumData($schema, $baseName,$subQName, $selectSubq, $fromSub,$select,$from, $whereSubq, $offset =null, $limit = null, $idRow =null)
    {
        return $this->dbConn->getEnumData($schema, $baseName,$subQName, $selectSubq, $fromSub,$select,$from, $whereSubq, $offset, $limit, $idRow );
    }

    public function startWhere($where)
    {
        return $this->dbConn->startWhere($where);
    }
    public function continueWhere($where1, $where2){

        return $this->dbConn->continueWhere($where1, $where2);
    }

    public function inWhere($field, $inData, $query, $baseName)
    {
        return $this->dbConn->inWhere($field, $inData, $query, $baseName);
            
    }

    public function endWhere($query)
    {
        return $this->dbConn->endWhere($query);
    }
    public function createIndex($schema, $tablename,$column){
        return $this->dbConn->createIndex($schema, $tablename, $column);
    }

    public function continueFromMultiSelect($enumSchema, $enumTableName,$currentTableName,  $multiTableName, $query, $baseName)
    {
        return $this->dbConn->continueFromMultiSelect($enumSchema, $enumTableName,$currentTableName,  $multiTableName, $query, $baseName);
    }
}

