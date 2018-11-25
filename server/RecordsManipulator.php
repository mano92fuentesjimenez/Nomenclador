<?php
/**
 * Created by PhpStorm.
 * User: mano
 * Date: 11/25/18
 * Time: 8:42 PM
 */

class RecordsManipulator
{
    public static function getMultiValueField($data,$fieldId,$ids){
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

    public static function getMultiValueFieldFromMod($data, $id){
        $arr = array();
        foreach ($data as $d){
            $arr[]= array($id, $d['valueField']);
        }
        return $arr;
    }

    public static function getIdsToRemoveMulti($data, $field){
        $arr = array();
        foreach ($data as $d){
            $arr[] = array($field=>$d[PrimaryKey::ID]);
        }
        return $arr;
    }
    public static function getColumn($data, $field)
    {
        $arr = array();
        foreach ($data as $record) {
            $arr[] = $record[$field];
        }
        return $arr;
    }

    public static function getRecordsIds($records){
        $arr =array();
        foreach ($records as $value){
            $arr[] = $value[PrimaryKey::ID];
        }
        return $arr;
    }
    public static function reIndexRecords($data)
    {
        $arr = array();
        foreach ($data as $key => $value) {
            $arr[$value[PrimaryKey::ID]] = $value;
        }
        return $arr;
    }

    public static function getRecordWithId(&$anyWhereData, $id){
        foreach ($anyWhereData as &$record){
            if($record[PrimaryKey::ID] == $id)
                return $record;
        }
        throw new Exception('Este error nunca debe pasar');
    }

    public static function mixDataFromAnyWhere(&$data, &$anyWhereData){

        foreach ($data as &$record){
            $id = $record[PrimaryKey::ID];
            $r = RecordsManipulator::getRecordWithId($anyWhereData,$id);

            foreach ($r as $key => $value ){
                $record[$key] = $value;
            }
        }
    }

    public static function getRevisionDescription($recordsFromUser, $recordsFromDb){
        $ret = array('underRevision'=> array(), 'ok'=>array());
        foreach ($recordsFromDb as $dbR){
            $pk = $dbR[PrimaryKey::ID];
            foreach ($recordsFromUser as $userR){
                if($userR[PrimaryKey::ID] == $pk ){
                    if($dbR[Revision::ID] == $userR[Revision::ID]){
                        $ret['ok'][] = $userR;
                    }
                    else{
                        $ret['underRevision'][] = $userR;
                    }
                    break;
                }
            }
        }
        return $ret;
    }


}