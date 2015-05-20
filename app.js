/// <reference path="typings/node/node.d.ts"/>
var xml2js = require('xml2js')
	, fs = require('fs')
	, mongoose = require('mongoose');

//mongoose.connect('mongodb://localhost/smartTester');  
var testSchema = new mongoose.Schema({
	name: String,
	lastRunTime: Date,
	outcome: String,
	duration: String
});

mongoose.model('test', testSchema);
var TestMongoose = mongoose.model('test');

var pathToTrx = __dirname + '/TrxDumps';
var pathToLastAccessedFile = __dirname + '/LastAccessedTime.json';
var patterns = [
            /Waiting for element: ([a-zA-Z0-9-_/+]+) to be visible. ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Getting Element: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Getting Elements: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Getting text of element: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Checking if element is visible: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Getting number of children of element: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /. ElementId: ([a-zA-Z0-9-_/+]+). Operand: ([a-zA-Z0-9-_/+]+)/,
            /Waiting on Element: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Executing jquery: ([\w\W]+)/
];
	
var parser =  new xml2js.Parser();

var append = function(matchText, p) {
	console.log('matchedText = ' + matchText);
    if (!matchText.startsWith(p))
    {
        matchText = p + matchText;
    }

    return matchText;
};

fs.readFile(pathToLastAccessedFile, function(err, data) {
	var parsedData = JSON.parse(data);
	var lastAccessedTime = parsedData.LastAccessedTime;
	fs.readdir(pathToTrx, function(err, files) {
		
		files.forEach(function(fileName){
			fs.stat(pathToTrx + '/' + fileName, function(err, stats) {
				var fileCreatedTime = stats.birthtime.getTime();
				console.log('stats: ' + fileCreatedTime);
				if(fileCreatedTime > lastAccessedTime) {
					// This file has not been processed yet.
					
					fs.readFile(pathToTrx + '/' + fileName, function(err, data) {
						parser.parseString(data, function(err, result) {
							var testResults = result.TestRun.Results[0].UnitTestResult;
							testResults.forEach(function(testResult){
								var test = testResult.$;
									mongoose.connect('mongodb://localhost/smartTester');																							
									TestMongoose.find({name:test.testName,lastRunTime:test.startTime}, function (err, tests) {
										  if (err) return console.error(err);
										  //console.log(tests);
										  if(!(tests && tests.length)) {
											  	var testModel = new TestMongoose();
												testModel.name = test.testName;
												testModel.outcome = test.outcome;
												testModel.lastRunTime = test.startTime;
												testModel.duration = test.duration; 
												testModel.save(function(err, savedInfo){ 
													console.log(savedInfo);
													mongoose.disconnect();					
												});
										  } else {
											console.log('test already exists');
											/* console line - 
												mongod
												use smartTester
												db.showCollections();
												db.tests.find();
											*/
												
										  	mongoose.disconnect();
										  }
									});
								
								
								var output = testResult.Output[0].StdOut[0];
								var lines = output.split('\n');
								console.log(lines.length);
								
//								var append = function(matchText, p) {
//								    if (!matchText.startsWith(p))
//								    {
//								        matchText = p + matchText;
//								    }
//								
//								    return matchText;
//								};

								lines.forEach(function(line) {
									patterns.forEach(function(pattern){
										var patternsMatched = line.match(pattern);

										if(patternsMatched && patternsMatched.length > 0) {
											var matchedText = patternsMatched[1];

											if (patternsMatched.length > 2)
				                            {
				                                var matchBy = patternsMatched[2];
				                                switch (matchBy)
				                                {
				                                    case "ById":
				                                        matchedText = append(matchedText.toString(), "#");
				                                        break;
				                                    case "ByClass":
				                                        matchedText = append(matchedText.toString(), ".");
				                                        break;
				                                }
				                            }
				                            else
				                            {
				                                try
				                                {
				                                    // This loop will only run incase a jquery command is executed.
				                                    // return jQuery('.dgFilterDeleteImg').is(':visible')
				                                    var queryStart = matchedText.indexOf('(');
				                                    var queryEnd = matchedText.LastIndexOf('.');
				                                    matchedText = matchedText.substring(queryStart + 2, queryEnd - queryStart - 3);
				                                }
				                                catch (e) { }
				                            }
											
											console.log(matchedText +'\n');
										}
										// todo
									});
								});
								
								
							});
						});					
					});
									
					// update the timestamp in lastaccessedtime.json
					// note: NOT THREAD SAFE
//					fs.readFile(pathToLastAccessedFile, function(err, data) {
//						var parsedLatestData = JSON.parse(data);
//						if(parsedLatestData.LastAccessedTime < fileCreatedTime) {
//							parsedLatestData.LastAccessedTime = fileCreatedTime;
//							fs.writeFile(pathToLastAccessedFile, JSON.stringify(parsedLatestData));
//						}
//					});
//					
					
				}
			});
		});
	});
});

