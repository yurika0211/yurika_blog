--
-- PostgreSQL database dump
--

\restrict 6nuX2c8IcJKuTmOMHF78pgU7OZXXVwOXolLaG7ukQwEQMthea911KQTB5QgjIqf

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: articles; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.articles (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    summary text,
    content text NOT NULL,
    tags text[],
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.articles OWNER TO admin;

--
-- Name: articles_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.articles_id_seq OWNER TO admin;

--
-- Name: articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;


--
-- Name: articles id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);


--
-- Data for Name: articles; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.articles (id, title, summary, content, tags, date) FROM stdin;
1	Title 1	Summary 1	Content 1	{Tag1}	2023-01-01 00:00:00
2	Title 2	Summary 2	Content 2	{Tag2,TagA}	2023-01-02 00:00:00
3	Title 3	Summary 3	Content 3	{Tag3}	2023-01-03 00:00:00
\.


--
-- Name: articles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.articles_id_seq', 3, true);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict 6nuX2c8IcJKuTmOMHF78pgU7OZXXVwOXolLaG7ukQwEQMthea911KQTB5QgjIqf

