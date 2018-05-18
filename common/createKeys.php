<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 11/05/2017
 * Time: 14:42
 */

require_once CARTOWEB_HOME.'include/Zend/Crypt/Rsa.php';
//require_once '../server/Enums.php';

function nomenclador_createKeys(){
    $generator = new Zend_Crypt_Rsa();
//    echo('Genering keys/n');

    $keys = $generator->generateKeys();
    //echo('Saving keys/n');
    $pathToDefaultsConfs = EnumsUtils::getdefaultsConfsPath();

    $publicKey = $keys['publicKey'];
    $privateKey = $keys['privateKey'];

    $strPubKey = $publicKey->toString();
    $strPrivKey = $privateKey->toString();

    $strPubKey = substr($strPubKey,0, strlen($strPubKey) -1);
    $strPrivKey = substr($strPrivKey,0, strlen($strPrivKey) -1);

    file_put_contents($pathToDefaultsConfs.'/public_key.pub',$strPubKey);
    file_put_contents($pathToDefaultsConfs.'/private_key.pem',$strPrivKey);
}
