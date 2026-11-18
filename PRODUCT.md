<!-- impeccable:product-schema 1 -->

# Prosa

## Purpose
Prosa é uma aplicação de estudo diário de idiomas através de uma sessão focada de vinte minutos (1200 segundos), estruturada pelo método de estudar um idioma através de outro (*through language*, com português brasileiro como apoio principal, nunca como língua-alvo). O produto combina uma narrativa contextualizada diária, repetição espaçada moderna (FSRS), treino de escuta e ritmo, fala e sombreamento fonético com feedback de cadência, e escrita reflexiva com escada de correção e reconstrução reversa.

## Target Audience & Situations
- **Estudante autodidata e profissional ocupado**: pessoas que buscam consistência diária sem sobrecarga de cursos infinitos ou gamificação infantilizada. Estudam no celular à noite ou no intervalo, ou no desktop/laptop durante a rotina de trabalho.
- **Intermediários e avançados que travam na fala e retenção**: estudantes que conhecem regras gramaticais básicas mas precisam de fluência auditiva, vocabulário ativo e capacidade de expressão natural.

## The Mechanism (O que só o Prosa tem)
- **Sessão diária única de vinte minutos com relógio adaptativo**: o tempo total de 20 minutos é fixo, mas a distribuição interna se adapta à necessidade do estudante — se o ouvido está fraco, o relógio transfere minutos da leitura para a escuta; se não há cartas de vocabulário devidas no FSRS, a etapa de revisão encolhe e a leitura expande.
- **Elenco pedagógico histórico**: 16 mentes históricas divididas em 4 papéis essenciais (Leitura, Memória, Fala e Diário), personificadas por personalidades marcantes (como Einstein, Curie, Feynman e Leonardo da Vinci).
- **Ciclo de reconstrução e fluência 4/3/2**: reconstrução reversa no 3º dia e voltas de fala cronometradas nos dias múltiplos de 3.

## Core Invariants & Constraints
- **Português brasileiro é idioma de apoio (*through*), nunca língua de estudo**.
- **Sem gamificação infantilizada**: nada de vidas perdidas, ofensivas punitivas, confetes estridentes ou personagens de desenho. O compromisso é a calma, a clareza e a retenção sólida.
- **Backend inviolável**: toda chamada de inteligência artificial, geração de áudio (Edge-TTS) e persistência passa pela API Fastify (`/api/v1/`). O front-end não fala diretamente com provedores externos de IA.
- **Planos**: Edição gratuita mantém uma lição por dia, um par de idiomas e histórico da lição atual; edição Pro oferece histórico ilimitado, tema diário livre e múltiplos pares de estudo.

## Platform
web
