drop table if exists users;

create table users (
    id serial primary key,
    username varchar(255) not null,
    password_hash text not null,
);

insert into users(username, password_hash)
values
    ('SHIOKOU', '123456');

drop table if exists users;

create table users (
    id serial primary key,
    username varchar(255) not null,
    password_hash text not null
);

insert into users (username, password_hash)
values
    ('SHIOKOU', '这里放真正的密码哈希值');
