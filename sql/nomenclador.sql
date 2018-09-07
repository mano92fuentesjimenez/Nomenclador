
create schema mod_nomenclador;

create table mod_nomenclador.datasources(
id serial primary key,
v  text,
proj  text,
enum_instance text
);
create table mod_nomenclador.enums(
id serial primary key,
v  text,
proj  text,
enum_instance text,
revision int default 0
);
create table mod_nomenclador.refs(
id serial primary key,
v  text,
proj  text,
enum_instance text
);
create table mod_nomenclador.simpletree(
id serial primary key,
v  text,
proj  text,
enum_instance text
);
create table mod_nomenclador.defaultfields(
id serial PRIMARY key ,
v  text
);
insert into mod_nomenclador.defaultfields values(0,'{"denominacion":{"type":"DB_String","needed":true,"id":"denominacion","header":"Denominaci&oacute;n","isDefault":true,"isDenom":true}}');