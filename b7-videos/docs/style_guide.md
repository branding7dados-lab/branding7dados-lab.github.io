# Guia de estilo B7 (referência: CENDAP – "emotion", 50,6 s, 9:16)

A referência dá o **movimento** e a **composição**. A B7 dá **cores e tipografia**.

## Ritmo
- CENDAP: 12 cortes secos em 50 s (mediana de 1,97 s). Quase tudo é transição contínua: morph, máscara, whip com motion blur.
- B7: a grade é de 120 bpm (beat = 0,5 s, compasso = 2 s). Algo novo a cada 2–4 beats. As mudanças grandes caem no downbeat; os acentos de texto caem na palavra falada da narração.
- O texto respira: cada frase-chave fica parada pelo menos 0,8 s depois de terminar de entrar. A CENDAP pecava aqui.

## Vocabulário de movimento
- **Entradas:** spring de baixo com overshoot de ~8% que assenta em 8–10 frames (SPRING.snappy). Texto entra palavra por palavra, sincronizado com a fala, com máscara subindo (rise + clip).
- **Saídas:** whip lateral ou vertical com motion blur (as duas cenas aparecem juntas na tela), ou o elemento vira o próximo.
- **Morph assinatura:** as **bolinhas do logo da B7** fazem o papel da bolinha vermelha da CENDAP. Elas pingam, viram cursor, botão ou card, e no reveal da marca convergem e formam a lâmpada.
- **Câmera:** push lento (log-space) nas cenas de UI e dolly-back no "só mais um" para revelar a multidão de cards iguais.
- **UI:** cards de Reels flutuando com sombra suave, contador de views rolando, cursor de mão com ripple de clique e moldura de seleção com alças, no estilo editor.

## Composição
- Margem segura de 9:16: 96 px nas laterais e 240 px no topo e na base, por causa da interface do Reels.
- Texto alinhado à esquerda nas cenas escuras e centralizado nas claras, como no storyboard.
- Escala: o título ocupa até 80% da largura, com 1 palavra de destaque por frase em magenta ou azul.

## Cor e textura
- **Escuro (base):** #0B0F1A com leve vinheta roxa (#6A2BD9 a 15%).
- **Claro (contraste):** #F5F7FA, usado em 2–3 cenas por vídeo.
- **Destaque:** degradê #1A2ACC → #6A2BD9 → #E02CA9. Só o magenta em palavras de dor; o azul em palavras de solução.
- **Logo:** usado como imagem (`brand/`), nunca redesenhado.
- **Sem glow genérico em tudo.** O brilho neon fica só no gráfico de crescimento e nos cards de pilares.

## Tipografia em movimento
- **Poppins:** 800/700 nos títulos, 500 nos textos de apoio e 600 nos rótulos de UI. Uma fonte só.
- **Títulos:** 96–120 px em 1080×1920. Rótulos de UI: no mínimo 34 px.

## Faça / não faça
- **Faça:** sincronizar cada palavra-chave com a narração; usar os prints reais com os números reais; manter o CTA parado e legível por pelo menos 1,5 s.
- **Não faça:** fade-in genérico; números de resultado inventados; flash branco em todo corte.
