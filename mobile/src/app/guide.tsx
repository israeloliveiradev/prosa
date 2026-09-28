import { Text, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { useCast } from "@/lib/cast";
import { keepWords } from "@/lib/text";

export default function GuideScreen() {
  const { people } = useCast();
  const names = people.map((person) => person.name);
  const sections = [
    {
      title: "Início",
      body: "A primeira tela só começa o dia. O botão abre a prosa de vinte minutos. Se você já abriu hoje, ele continua de onde parou. O tema personalizado e um segundo idioma pedem Prosa Pro.",
    },
    {
      title: "A prosa de vinte minutos",
      body: `${names[0]} lê a história. ${names[1]} mostra as palavras para revisar. ${names[2]} pede que você fale. ${names[3]} abre o diário. O relógio avança sozinho; Continuar pula para a próxima parte. Troque o elenco em Configurações.`,
    },
    {
      title: "Ouvir e viva-voz",
      body: "Ouvir a história pede a voz neural na primeira frase e segue nas seguintes. Viva-voz apresenta o tema, diz a frase, espera você repetir e confirma. Escolha a voz em Voz, embaixo da história.",
    },
    {
      title: "Palavra e frase",
      body: "Um toque numa palavra abre o vocabulário e deixa salvar no deck. Dois toques na mesma frase desmontam sujeito, tempo, verbo e complemento. Entre na conta para essa desmontagem.",
    },
    {
      title: "Notícias",
      body: "O boletim busca o que saiu hoje no assunto da conta. Ouvir usa a mesma voz da prosa. Estudar esta notícia abre os vinte minutos com aquele texto.",
    },
    {
      title: "Prática",
      body: "Duelo: 120 segundos, uma lacuna, quatro escolhas. Cena: uma conversa no tom do lugar. A dica cultural vem no idioma de apoio. Os dois pedem conta.",
    },
    {
      title: "Memória",
      body: "O mapa de retenção mostra o que está em risco. Os números nas células e a legenda valem mais que a cor. Toque numa célula vermelha para revisar as cartas críticas.",
    },
    {
      title: "Tema e conta",
      body: "O interruptor em Perfil troca claro e escuro na hora. Conta guarda e-mail, plano e o elenco. Como usar reabre este guia.",
    },
  ] as const;

  return (
    <AppFrame>
      <PageMasthead
        kicker="Como usar"
        title="O caminho do dia."
        dek="Vinte minutos. Leitura, memória, fala e diário. O restante das telas segura o que sobra do dia."
      />
      <View className="mt-12 gap-10">
        {sections.map((section, index) => (
          <View key={section.title} className="border-t border-line pt-6">
            <Text className="font-label text-[11px] uppercase tracking-[0.28em] text-ember">0{index + 1}</Text>
            <Text className="font-displayItalic mt-2 text-headline text-ink">{section.title}</Text>
            <Text className="mt-3 max-w-2xl text-base leading-7 text-ink">{keepWords(section.body)}</Text>
          </View>
        ))}
      </View>
    </AppFrame>
  );
}
