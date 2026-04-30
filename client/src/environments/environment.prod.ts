export const environment = {
    production: true,
    serverUrl: 'http://ec2-52-60-79-123.ca-central-1.compute.amazonaws.com:3000/api',
    baseUrl: 'http://ec2-52-60-79-123.ca-central-1.compute.amazonaws.com:3000/',
};

export enum NameSpaces {
    GameNamespace = 'game',
    MatchNamespace = 'match',
    PlayerNamespace = 'player',
    TimerNamespace = 'timer',
    ChatNamespace = 'chat',
    LogNamespace = 'log',
}


