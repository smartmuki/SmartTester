/// <reference path="typings/node/node.d.ts"/>
var xml2js = require('xml2js')
	, fs = require('fs')
	, async = require('async')
	, mongoose = require('mongoose');

//mongoose.connect('mongodb://localhost/smartTester');  
var testSchema = new mongoose.Schema({
	name: String,
	lastRunTime: Date,
	outcome: String,
	duration: String,
	patterns: [String],
	nightly: Boolean
});

mongoose.model('test', testSchema);
var TestMongoose = mongoose.model('test');

mongoose.connect('mongodb://localhost/smartTester');

var parser =  new xml2js.Parser();

var pathToTrx = 'E:\\TrxDumps\\PPE\\Results';
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
	
fs.readFile(pathToLastAccessedFile, function(err, data) {
	var parsedData = JSON.parse(data);
	var lastAccessedTime = parsedData.LastAccessedTime;
	processDirectory(pathToTrx, lastAccessedTime);
});

function processDirectory(directory, lastAccessedTime) {
	fs.readdir(directory, function(err, files) {
		files.forEach(function(fileName){
			fs.stat(directory + '\\' + fileName, function(err, stats) {
				if(err) { console.log(err); }
				if(stats.isDirectory()) {
					 processDirectory(directory + '\\' + fileName, lastAccessedTime);
				}
				else {
					processFile(directory + '\\' + fileName, lastAccessedTime);
				}
			});			
		});
	});
}

function processFile(fileName, lastAccessedTime) {
			fs.stat(fileName, function(err, stats) {
				var fileCreatedTime = stats.birthtime.getTime();
				if(fileCreatedTime > lastAccessedTime) {
					// This file has not been processed yet.
					fs.readFile(fileName, function(err, data) {
						parser.parseString(data, function(err, result) {
							var testResults = result.TestRun.Results[0].UnitTestResult;
							testResults.forEach(function(testResult){
								var test = testResult.$;						
								
								var output = testResult.Output[0].StdOut[0];
								var lines = output.split('\n');
								
								var patternsFound = [];
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
														//matchedText = append(matchedText.toString(), "#");
														if (matchedText[0] != "#")
													    {
													        matchedText = "#" + matchedText;
													    }
				                                        break;
				                                    case "ByClass":
				                                        //matchedText = append(matchedText.toString(), ".");
														if (matchedText[0] != ".")
													    {
													        matchedText = "." + matchedText;
													    }
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
													var queryEnd = matchedText.lastIndexOf('\.');
				                                    matchedText = matchedText.substring(queryStart + 2, queryEnd);
				                                }
				                                catch (e) { }
				                            }
											
											patternsFound.push(matchedText);
										}
										// todo
									});
								});


									//var db = mongoose.createConnection('localhost', 'smartTester');																														
									TestMongoose.find({name:test.testName,lastRunTime:test.startTime}, function (err, tests) {
										  if (err) return console.error(err);
										  //console.log(tests);
										  if(!(tests && tests.length)) {
											  	var testModel = new TestMongoose();
												testModel.name = test.testName;
												testModel.outcome = test.outcome;
												testModel.lastRunTime = test.startTime;
												testModel.duration = test.duration;
												testModel.patterns = patternsFound; 
												testModel.nightly = false;
												testModel.save(function(err, savedInfo){ 
													console.log('uploaded for test: ' + test.testName);
													//mongoose.disconnect();					
												});
										  } else {
											console.log('test already exists: ' + test.testName);
											/* console line - 
												mongod
												use smartTester
												db.showCollections();
												db.tests.find();
											*/
										  }
									});
								
//		write to a file								
//								var testDetails = { 
//									name: test.testName,
//									outcome: test.outcome,
//									duration: test.duration,
//									patterns: patternsFound,
//									lastRunTime: test.startTime,
//									nightly: false
//								};
//									
//								var generatedFileName = test.testName + "_" + test.startTime;
//								generatedFileName = generatedFileName.replace(/:/g, '_').replace(/\+/g,'_').replace(/\./g,'_').replace(/\-/g,'_') + '.json';
//								fs.writeFile('E:\\TrxDumps\\JsonDumps\\' + generatedFileName, JSON.stringify(testDetails), function(err, data) {
//									if(err) { console.log(err); }
//								});
							});
						});					
					});
									
					// update the timestamp in lastaccessedtime.json
					// note: NOT THREAD SAFE
					fs.readFile(pathToLastAccessedFile, function(err, data) {
						var parsedLatestData = JSON.parse(data);
						if(parsedLatestData.LastAccessedTime < fileCreatedTime) {
							parsedLatestData.LastAccessedTime = fileCreatedTime;
							fs.writeFile(pathToLastAccessedFile, JSON.stringify(parsedLatestData));
						}
					});					
				}
			});
}


// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {  
  mongoose.connection.close(function () { 
    console.log('Mongoose default connection disconnected through app termination'); 
    process.exit(0); 
  }); 
}); 